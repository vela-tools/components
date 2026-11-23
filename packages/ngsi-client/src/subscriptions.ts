import type {
    NotificationEndpoint,
    NotificationFormat,
    NotificationPayload,
    NotificationTrigger,
    Subscription,
    SubscriptionDelivery,
    SubscriptionEntitySelector,
    SubscriptionNotify,
    SubscriptionPatch,
    SubscriptionStore,
    SubscriptionUnreadable,
} from "@vela-tools/ngsi";
import type { z } from "zod";
import type { NgsiLdClientConfig } from "./config";
import { toGeoQuery } from "./geo";
import { NgsiValidationError } from "./entities";
import { NgsiClientError, type Http } from "./http";
import { fromTypeRef, toTypeRef } from "./iri";
import { randomUuid } from "./ids";
import { allPages, truncatedReason } from "./pages";
import { notificationSchema, reasonOf, subscriptionSchema } from "./schemas";

const TRIGGERS: readonly NotificationTrigger[] = [
    "entityCreated",
    "entityUpdated",
    "entityDeleted",
    "attributeCreated",
    "attributeUpdated",
    "attributeDeleted",
];

const isTrigger = (value: string): value is NotificationTrigger => (TRIGGERS as readonly string[]).includes(value);

type RawSubscription = z.output<typeof subscriptionSchema>;

function notifyOf(raw: RawSubscription): SubscriptionNotify | undefined {
    if (raw.timeInterval !== undefined) return { kind: "every", seconds: raw.timeInterval };
    const triggers = raw.notificationTrigger?.filter(isTrigger) ?? [];
    if (!triggers.length && raw.throttling === undefined) return undefined;
    return {
        kind: "onChange",
        ...(triggers.length ? { triggers } : {}),
        ...(raw.throttling !== undefined ? { throttling: raw.throttling } : {}),
    };
}

function deliveryOf(raw: RawSubscription): SubscriptionDelivery | undefined {
    const n = raw.notification;
    if (!n) return undefined;
    const delivery: SubscriptionDelivery = {
        ...(n.status === "ok" || n.status === "failed" ? { status: n.status } : {}),
        ...(n.timesSent !== undefined ? { timesSent: n.timesSent } : {}),
        ...(n.timesFailed !== undefined ? { timesFailed: n.timesFailed } : {}),
        ...(n.lastNotification ? { lastNotification: n.lastNotification } : {}),
        ...(n.lastSuccess ? { lastSuccess: n.lastSuccess } : {}),
        ...(n.lastFailure ? { lastFailure: n.lastFailure } : {}),
    };
    return Object.keys(delivery).length ? delivery : undefined;
}

const FORMATS = new Map<string, NotificationFormat>([
    ["normalized", "normalized"],
    ["concise", "concise"],
    ["keyValues", "keyValues"],
    ["simplified", "keyValues"],
]);

function payloadOf(raw: RawSubscription): NotificationPayload | undefined {
    const n = raw.notification;
    if (!n) return undefined;
    const pick = n.pick ?? n.attributes;
    const join = n.join === "flat" || n.join === "inline" ? n.join : undefined;
    return {
        format: (n.format && FORMATS.get(n.format)) || "normalized",
        ...(pick?.length ? { pick } : {}),
        ...(n.omit?.length ? { omit: n.omit } : {}),
        ...(n.showChanges ? { showChanges: true } : {}),
        ...(n.sysAttrs ? { sysAttrs: true } : {}),
        ...(join ? { join } : {}),
        ...(join && n.joinLevel !== undefined ? { joinLevel: n.joinLevel } : {}),
    };
}

function endpointOf(raw: RawSubscription): NotificationEndpoint | undefined {
    const endpoint = raw.notification?.endpoint;
    if (!endpoint) return undefined;
    return { uri: endpoint.uri, ...(endpoint.accept ? { accept: endpoint.accept } : {}) };
}

function statusOf(raw: RawSubscription): Subscription["status"] {
    if (raw.status === "expired") return "expired";
    return raw.isActive === false || raw.status === "paused" ? "paused" : "active";
}

function selectorsOf(raw: RawSubscription): SubscriptionEntitySelector[] {
    return (raw.entities ?? []).flatMap((e) =>
        e.type && (e.id || e.idPattern)
            ? [
                  {
                      type: toTypeRef(e.type),
                      ...(e.id ? { id: e.id } : {}),
                      ...(e.idPattern ? { idPattern: e.idPattern } : {}),
                  },
              ]
            : [],
    );
}

const typesOf = (raw: RawSubscription) =>
    [...new Set((raw.entities ?? []).flatMap((e) => (e.type ? [e.type] : [])))].map(toTypeRef);

const brokerSubscription = subscriptionSchema.transform((raw): Subscription => {
    const selectors = selectorsOf(raw);
    const notify = notifyOf(raw);
    const payload = payloadOf(raw);
    const endpoint = endpointOf(raw);
    const delivery = deliveryOf(raw);
    return {
        id: raw.id,
        ...(raw.subscriptionName ? { name: raw.subscriptionName } : {}),
        ...(raw.description ? { description: raw.description } : {}),
        types: typesOf(raw),
        watchedAttributes: raw.watchedAttributes ?? [],
        ...(raw.q ? { q: raw.q } : {}),
        ...(raw.geoQ ? { geo: raw.geoQ } : {}),
        ...(raw.scopeQ ? { scopeQ: raw.scopeQ } : {}),
        ...(notify ? { notify } : {}),
        ...(raw.expiresAt ? { expiresAt: raw.expiresAt } : {}),
        ...(raw.lang ? { lang: raw.lang } : {}),
        ...(payload ? { payload } : {}),
        ...(raw.jsonldContext ? { jsonldContext: raw.jsonldContext } : {}),
        ...(raw.expandValues?.length ? { expandValues: raw.expandValues } : {}),
        ...(raw.jsonKeys?.length ? { jsonKeys: raw.jsonKeys } : {}),
        status: statusOf(raw),
        ...(endpoint ? { endpoint } : {}),
        ...(delivery ? { delivery } : {}),
        ...(selectors.length ? { selectors } : {}),
    };
});

type Field = SubscriptionUnreadable["field"];

const MEMBER_FIELDS: Record<string, Field> = {
    subscriptionName: "name",
    description: "description",
    entities: "types",
    watchedAttributes: "watchedAttributes",
    notificationTrigger: "notify",
    q: "q",
    geoQ: "geo",
    scopeQ: "scopeQ",
    throttling: "notify",
    timeInterval: "notify",
    expiresAt: "expiresAt",
    lang: "lang",
    jsonldContext: "jsonldContext",
    expandValues: "expandValues",
    jsonKeys: "jsonKeys",
    isActive: "status",
    status: "status",
};

const NOTIFICATION_FIELDS: Record<string, Field> = {
    format: "payload",
    attributes: "payload",
    pick: "payload",
    omit: "payload",
    showChanges: "payload",
    sysAttrs: "payload",
    join: "payload",
    joinLevel: "payload",
    endpoint: "endpoint",
    status: "delivery",
    timesSent: "delivery",
    timesFailed: "delivery",
    lastNotification: "delivery",
    lastSuccess: "delivery",
    lastFailure: "delivery",
};

type Unreadable = SubscriptionUnreadable & { reason: string };

type Readable = { value: Record<string, unknown>; unreadable: Unreadable[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

function dropUnreadable(
    value: Record<string, unknown>,
    shape: Record<string, z.ZodType>,
    fields: Record<string, Field>,
    prefix: string,
): Readable {
    const kept = { ...value };
    const unreadable: Unreadable[] = [];
    for (const [key, field] of Object.entries(fields)) {
        if (kept[key] === undefined) continue;
        const r = shape[key].safeParse(kept[key]);
        if (r.success) continue;
        delete kept[key];
        unreadable.push({ member: `${prefix}${key}`, field, reason: `${prefix}${key}: ${reasonOf(r.error)}` });
    }
    return { value: kept, unreadable };
}

function readable(item: Record<string, unknown>): Readable {
    const top = dropUnreadable(item, subscriptionSchema.shape, MEMBER_FIELDS, "");
    const notification = top.value.notification;
    if (notification === undefined) return top;
    if (!isRecord(notification)) {
        const value = { ...top.value };
        delete value.notification;
        return {
            value,
            unreadable: [
                ...top.unreadable,
                { member: "notification", field: "payload", reason: "notification: not an object" },
            ],
        };
    }
    const inner = dropUnreadable(notification, notificationSchema.shape, NOTIFICATION_FIELDS, "notification.");
    return { value: { ...top.value, notification: inner.value }, unreadable: [...top.unreadable, ...inner.unreadable] };
}

const readableValue = (item: unknown) => (isRecord(item) ? readable(item).value : item);

function readSubscription(
    item: unknown,
    config: NgsiLdClientConfig,
): { ok: true; subscription: Subscription } | { ok: false; reason: string } {
    const { value, unreadable } = isRecord(item) ? readable(item) : { value: item, unreadable: [] };
    const r = brokerSubscription.safeParse(value);
    if (!r.success) {
        config.onInvalid?.({ kind: "subscription", value: item, reason: reasonOf(r.error) });
        return { ok: false, reason: reasonOf(r.error) };
    }
    for (const u of unreadable) config.onInvalid?.({ kind: "subscription", value: item, reason: u.reason });
    const members = unreadable.map(({ member, field }) => ({ member, field }));
    return { ok: true, subscription: members.length ? { ...r.data, unreadable: members } : r.data };
}

type Members = Record<string, unknown>;

const trimmed = (value: string | null | undefined) => (value === null ? null : value?.trim());

const isEmpty = (value: unknown) => value === null || value === "" || (Array.isArray(value) && value.length === 0);

function notifyMembers(notify: SubscriptionNotify | null | undefined): Members {
    if (!notify) return {};
    if (notify.kind === "every") return { timeInterval: notify.seconds };
    return {
        ...(notify.triggers?.length ? { notificationTrigger: notify.triggers } : {}),
        ...(notify.throttling !== undefined ? { throttling: notify.throttling } : {}),
    };
}

function brokerMembers(values: SubscriptionPatch): Members {
    const members: Members = {};
    const put = (key: string, value: unknown) => {
        if (value !== undefined && !isEmpty(value)) members[key] = value;
    };
    put("subscriptionName", trimmed(values.name));
    put("description", trimmed(values.description));
    if (values.types) members.entities = values.types.map((t) => ({ type: fromTypeRef(t) }));
    put("watchedAttributes", values.watchedAttributes);
    put("q", trimmed(values.q));
    put("geoQ", values.geo ? toGeoQuery(values.geo) : values.geo);
    put("scopeQ", trimmed(values.scopeQ));
    put("expiresAt", values.expiresAt);
    put("lang", trimmed(values.lang));
    put("jsonldContext", trimmed(values.jsonldContext));
    put("expandValues", values.expandValues);
    put("jsonKeys", values.jsonKeys);
    if (values.status) members.isActive = values.status === "active";
    return { ...members, ...notifyMembers(values.notify) };
}

const REMOVABLE_KEYS = [
    "name",
    "description",
    "watchedAttributes",
    "q",
    "geo",
    "scopeQ",
    "notify",
    "expiresAt",
    "lang",
    "jsonldContext",
    "expandValues",
    "jsonKeys",
] as const;

function removedMembers(patch: SubscriptionPatch): string[] {
    return REMOVABLE_KEYS.filter((key) => {
        const value = patch[key];
        return value !== undefined && isEmpty(typeof value === "string" ? value.trim() : value);
    });
}

function payloadMembers(payload: NotificationPayload | null | undefined): Members {
    if (!payload) return {};
    return {
        format: payload.format,
        ...(payload.pick?.length ? { pick: payload.pick } : {}),
        ...(payload.omit?.length ? { omit: payload.omit } : {}),
        ...(payload.showChanges ? { showChanges: true } : {}),
        ...(payload.sysAttrs ? { sysAttrs: true } : {}),
        ...(payload.join ? { join: payload.join } : {}),
        ...(payload.join && payload.joinLevel !== undefined ? { joinLevel: payload.joinLevel } : {}),
    };
}

const PAYLOAD_KEYS = ["format", "attributes", "pick", "omit", "showChanges", "sysAttrs", "join", "joinLevel"];
const OUTPUT_ONLY_KEYS = ["status", "timesSent", "timesFailed", "lastNotification", "lastSuccess", "lastFailure"];

function resentNotification(
    current: Members,
    payload: NotificationPayload | null | undefined,
    endpoint: NotificationEndpoint | undefined,
): Members {
    const dropped = payload === undefined ? OUTPUT_ONLY_KEYS : [...PAYLOAD_KEYS, ...OUTPUT_ONLY_KEYS];
    const kept: Members = Object.fromEntries(Object.entries(current).filter(([key]) => !dropped.includes(key)));
    if (endpoint) kept.endpoint = { ...(kept.endpoint as Members | undefined), ...endpoint };
    return payload === undefined ? kept : { ...kept, ...payloadMembers(payload) };
}

function endpointUri(endpoint: NotificationEndpoint | undefined): string {
    const uri = endpoint?.uri.trim();
    if (!uri) throw new NgsiValidationError("A subscription needs a notification endpoint URI.", endpoint);
    return uri;
}

const READ_HEADERS = { Accept: "application/ld+json" };

export function createSubscriptionStore(http: Http, config: NgsiLdClientConfig): SubscriptionStore {
    return {
        async list(opts) {
            const items = await allPages(http, "/subscriptions", "subscriptions", {
                signal: opts?.signal,
                headers: READ_HEADERS,
                onTruncated: () =>
                    config.onInvalid?.({
                        kind: "subscription",
                        value: undefined,
                        reason: truncatedReason("subscriptions"),
                    }),
            });
            return items.flatMap((item) => {
                const r = readSubscription(item, config);
                return r.ok ? [r.subscription] : [];
            });
        },

        async get(id, opts) {
            try {
                const { body } = await http.request("GET", `/subscriptions/${encodeURIComponent(id)}`, {
                    signal: opts?.signal,
                    headers: READ_HEADERS,
                });
                const r = readSubscription(body, config);
                if (!r.ok)
                    throw new NgsiValidationError(
                        `Subscription ${id} from the broker can't be read: ${r.reason}`,
                        body,
                    );
                return r.subscription;
            } catch (e) {
                if (e instanceof NgsiClientError && e.status === 404) return null;
                throw e;
            }
        },

        async create(draft, opts) {
            const endpoint = { uri: endpointUri(draft.endpoint), accept: draft.endpoint?.accept ?? "application/json" };
            const id = `urn:ngsi-ld:Subscription:${randomUuid()}`;
            await http.request("POST", "/subscriptions", {
                signal: opts?.signal,
                body: {
                    id,
                    type: "Subscription",
                    ...brokerMembers(draft),
                    notification: {
                        ...payloadMembers(draft.payload),
                        endpoint,
                    },
                },
            });
            return { ...draft, id, status: "active", endpoint, delivery: { timesSent: 0 } };
        },

        async update(id, patch, opts) {
            const path = `/subscriptions/${encodeURIComponent(id)}`;
            const removed = removedMembers(patch);
            if (removed.length)
                throw new NgsiValidationError(
                    `Members can't be removed from an existing subscription: ${removed.join(", ")}`,
                    patch,
                );
            const body = brokerMembers(patch);
            if (patch.endpoint) endpointUri(patch.endpoint);
            if (patch.payload !== undefined || patch.endpoint) {
                const { body: current } = await http.request("GET", path, {
                    signal: opts?.signal,
                    headers: READ_HEADERS,
                });
                const r = subscriptionSchema.safeParse(readableValue(current));
                if (!r.success)
                    throw new NgsiValidationError(
                        `Subscription ${id} from the broker can't be read: ${reasonOf(r.error)}`,
                        current,
                    );
                if (!r.data.notification?.endpoint)
                    throw new NgsiValidationError(
                        `Subscription ${id} from the broker has no notification endpoint.`,
                        current,
                    );
                body.notification = resentNotification(r.data.notification, patch.payload, patch.endpoint);
            }
            await http.request("PATCH", path, { signal: opts?.signal, body });
        },

        async setStatus(id, status, opts) {
            await http.request("PATCH", `/subscriptions/${encodeURIComponent(id)}`, {
                signal: opts?.signal,
                body: { isActive: status === "active" },
            });
        },

        async remove(id, opts) {
            await http.request("DELETE", `/subscriptions/${encodeURIComponent(id)}`, { signal: opts?.signal });
        },
    };
}
