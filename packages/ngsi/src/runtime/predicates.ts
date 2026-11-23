import type {
    EntityQuery,
    EntityTypeInfo,
    EntityTypeRef,
    GeoFilter,
    NgsiLdEntity,
    SavedQuery,
    Subscription,
    SubscriptionDraft,
    SubscriptionNotify,
    SubscriptionPatch,
    SubscriptionStatusChange,
} from "../types";
import type { Capabilities } from "./capabilities";
import type { SelectionState } from "./store";
import { applySubscriptionPatch } from "./subscriptionPatch";

export type SelectTypesRejection = "unknown-type";

export type SelectAttributeRejection =
    "no-entity-selected" | "entity-not-found" | "reserved-attribute" | "attribute-not-on-entity";

export type CreateSubscriptionRejection = "no-subscriptions-adapter" | "invalid-draft";

export type DraftIssue = { field: keyof SubscriptionDraft; message: string };

export type SetSubscriptionStatusRejection =
    "no-subscriptions-adapter" | "subscription-not-found" | "subscription-expired" | "status-unchanged";

export type UpdateSubscriptionRejection = "no-subscriptions-adapter" | "subscription-not-found" | "invalid-draft";

export type RemoveSubscriptionRejection = "no-subscriptions-adapter" | "subscription-not-found";

export type SaveQueryRejection = "no-saved-queries-adapter" | "blank-name";

export type UpdateSavedQueryRejection = "no-saved-queries-adapter" | "blank-name" | "saved-query-not-found";

export type RemoveSavedQueryRejection = "no-saved-queries-adapter" | "saved-query-not-found";

export type SetGeoFilterRejection = "invalid-radius" | "invalid-coordinates";

export type SetQueryRejection = SelectTypesRejection | "empty-q" | "invalid-geo" | "invalid-paging";

const RESERVED_KEYS = new Set(["id", "type", "@context"]);

const fullType = (t: EntityTypeRef) => `${t.contextUri ?? ""}${t.type}`;

export function sameTypeRef(a: EntityTypeRef, b: EntityTypeRef): boolean {
    if (a.contextUri && b.contextUri) return fullType(a) === fullType(b);
    return a.type === b.type;
}

export function entityMatchesTypes(entity: NgsiLdEntity, types: EntityTypeRef[]): boolean {
    return types.some((t) => entity.type === t.type || entity.type === fullType(t));
}

export function entityAttributeNames(entity: NgsiLdEntity | null | undefined): string[] {
    return entity ? Object.keys(entity).filter((key) => !RESERVED_KEYS.has(key)) : [];
}

export function selectTypesDisabled(
    knownTypes: EntityTypeInfo[] | undefined,
    types: EntityTypeRef[],
): SelectTypesRejection | null {
    if (!knownTypes) return null;
    const allKnown = types.every((t) => knownTypes.some((k) => sameTypeRef(k.type, t)));
    return allKnown ? null : "unknown-type";
}

export function selectAttributeDisabled(
    state: SelectionState,
    entity: NgsiLdEntity | null | undefined,
    attribute: string,
    entityId: string | null = state.entityId,
): SelectAttributeRejection | null {
    if (!entityId) return "no-entity-selected";
    if (RESERVED_KEYS.has(attribute)) return "reserved-attribute";
    if (entity === null) return "entity-not-found";
    if (entity && !(attribute in entity)) return "attribute-not-on-entity";
    return null;
}

const isBlank = (value: string | undefined) => !value || value.trim() === "";

const isPositive = (value: number) => Number.isFinite(value) && value > 0;

function notifyIssues(draft: Partial<SubscriptionDraft>): DraftIssue[] {
    const notify = draft.notify;
    if (!notify) return [];
    if (notify.kind === "every") {
        const issues: DraftIssue[] = [];
        if (!isPositive(notify.seconds))
            issues.push({ field: "notify", message: "Notify every N seconds needs a number of seconds above 0." });
        if (draft.watchedAttributes?.length) {
            issues.push({
                field: "watchedAttributes",
                message: "Watched attributes only apply when notifying on change.",
            });
        }
        return issues;
    }
    if (notify.throttling !== undefined && !isPositive(notify.throttling)) {
        return [{ field: "notify", message: "The minimum time between notifications must be above 0 seconds." }];
    }
    return [];
}

const URI = /^[a-z][a-z0-9+.-]*:\S+$/i;

function payloadIssues(draft: Partial<SubscriptionDraft>): DraftIssue[] {
    const issues: DraftIssue[] = [];
    const payload = draft.payload;
    if (payload) {
        if (payload.showChanges && payload.format === "keyValues") {
            issues.push({ field: "payload", message: "Previous values can't be included in the key-values format." });
        }
        if (payload.pick?.some(isBlank) || payload.omit?.some(isBlank)) {
            issues.push({ field: "payload", message: "Remove the blank attribute from the payload." });
        }
        if (payload.join) {
            issues.push({ field: "payload", message: "This broker rejects subscriptions that join linked entities." });
        } else if (payload.joinLevel !== undefined) {
            issues.push({
                field: "payload",
                message: "The link depth must be a whole number above 0 and needs linked entities.",
            });
        }
    }
    if (draft.jsonldContext !== undefined && !URI.test(draft.jsonldContext)) {
        issues.push({ field: "jsonldContext", message: "The @context must be a URI." });
    }
    if (draft.expandValues?.some(isBlank)) {
        issues.push({ field: "expandValues", message: "Remove the blank attribute from the expanded values." });
    }
    if (draft.jsonKeys?.some(isBlank)) {
        issues.push({ field: "jsonKeys", message: "Remove the blank attribute from the JSON keys." });
    }
    return issues;
}

export function draftIssues(
    draft: Partial<SubscriptionDraft>,
    knownTypes?: EntityTypeInfo[],
    now: number = Date.now(),
): DraftIssue[] {
    const issues: DraftIssue[] = [];
    const types = draft.types ?? [];
    if (isBlank(draft.name)) issues.push({ field: "name", message: "Give the subscription a name." });
    if (!types.length || types.some((t) => isBlank(t.type))) {
        issues.push({ field: "types", message: "Pick at least one entity type." });
    } else if (selectTypesDisabled(knownTypes, types)) {
        issues.push({ field: "types", message: "One of the selected types is not on this broker." });
    }
    if (draft.watchedAttributes?.some(isBlank)) {
        issues.push({ field: "watchedAttributes", message: "Remove the blank watched attribute." });
    }
    if (draft.geo && setGeoFilterDisabled(draft.geo)) {
        issues.push({ field: "geo", message: "The geo region needs valid coordinates and a radius above 0." });
    }
    const uri = draft.endpoint?.uri.trim();
    if (!uri) issues.push({ field: "endpoint", message: "Give the URI the broker sends notifications to." });
    else if (!URI.test(uri))
        issues.push({
            field: "endpoint",
            message: "The notification URI must be an absolute URI, for example https://example.org/notify.",
        });
    issues.push(...notifyIssues(draft));
    issues.push(...payloadIssues(draft));
    if (draft.expiresAt !== undefined && !(Date.parse(draft.expiresAt) > now)) {
        issues.push({ field: "expiresAt", message: "The expiry must be a date and time in the future." });
    }
    return issues;
}

export function createSubscriptionDisabled(
    capabilities: Pick<Capabilities, "subscriptions">,
    draft: Partial<SubscriptionDraft>,
    knownTypes?: EntityTypeInfo[],
): CreateSubscriptionRejection | null {
    if (!capabilities.subscriptions) return "no-subscriptions-adapter";
    if (draftIssues(draft, knownTypes).length > 0) return "invalid-draft";
    return null;
}

const issueKey = (issue: DraftIssue) => `${issue.field}\n${issue.message}`;

const REMOVABLE: [keyof SubscriptionDraft & keyof SubscriptionPatch, string][] = [
    ["description", "description"],
    ["q", "condition"],
    ["geo", "geo region"],
    ["scopeQ", "scope query"],
    ["expiresAt", "expiry"],
    ["expandValues", "expanded values"],
    ["jsonKeys", "JSON keys"],
];

const isEmpty = (value: unknown) => value === null || value === "" || (Array.isArray(value) && value.length === 0);

const hasValue = (value: unknown) => value !== undefined && !isEmpty(value);

const removal = (field: keyof SubscriptionDraft, label: string): DraftIssue => ({
    field,
    message: `This broker can't remove the ${label} from an existing subscription. Delete the subscription and create it again.`,
});

const notifyKind = (notify: SubscriptionNotify | null | undefined) => notify?.kind ?? "onChange";

const switchesNotifyKind = (original: Subscription, patch: SubscriptionPatch) =>
    patch.notify !== undefined && notifyKind(original.notify) !== notifyKind(patch.notify);

function notifyRemovals(original: Subscription, patch: SubscriptionPatch): DraftIssue[] {
    const before = original.notify;
    if (patch.notify === undefined || before?.kind !== "onChange") return [];
    const next = patch.notify?.kind === "onChange" ? patch.notify : undefined;
    const issues: DraftIssue[] = [];
    if (before.triggers?.length && !next?.triggers?.length) issues.push(removal("notify", "notification triggers"));
    if (before.throttling !== undefined && next?.throttling === undefined)
        issues.push(removal("notify", "minimum time between notifications"));
    return issues;
}

export const SELECTORS_LOCKED =
    "This subscription also selects entities by id, which can't be edited here, so its types can't be changed. Delete the subscription and create it again.";

function unreadableIssues(original: Subscription, patch: SubscriptionPatch): DraftIssue[] {
    const byField = new Map<keyof SubscriptionDraft, string[]>();
    for (const { member, field } of original.unreadable ?? []) {
        if (field === "status" || field === "delivery" || patch[field] === undefined) continue;
        byField.set(field, [...(byField.get(field) ?? []), member]);
    }
    return [...byField].map(([field, members]) => ({
        field,
        message: `The broker has a value for ${members.join(", ")} that can't be read, so it can't be changed here. Delete the subscription and create it again.`,
    }));
}

function brokerEditIssues(original: Subscription, patch: SubscriptionPatch): DraftIssue[] {
    const issues = REMOVABLE.filter(
        ([key]) => hasValue(original[key]) && patch[key] !== undefined && isEmpty(patch[key]),
    ).map(([key, label]) => removal(key, label));
    if (switchesNotifyKind(original, patch)) {
        issues.push({
            field: "notify",
            message:
                "This broker can't switch an existing subscription between notifying on change and every N seconds. Delete it and create it again.",
        });
    } else {
        if (original.watchedAttributes.length && patch.watchedAttributes?.length === 0)
            issues.push(removal("watchedAttributes", "watched attributes"));
        issues.push(...notifyRemovals(original, patch));
    }
    if (patch.lang !== undefined)
        issues.push({ field: "lang", message: "This broker can't change the language of an existing subscription." });
    if (patch.jsonldContext !== undefined) {
        issues.push({
            field: "jsonldContext",
            message: "The @context is stored by the broker as its own copy and can't be changed.",
        });
    }
    if (patch.types && original.selectors?.length) {
        issues.push({ field: "types", message: SELECTORS_LOCKED });
    }
    return [...issues, ...unreadableIssues(original, patch)];
}

export function updateIssues(
    original: Subscription,
    patch: SubscriptionPatch,
    knownTypes?: EntityTypeInfo[],
    now: number = Date.now(),
): DraftIssue[] {
    const existing = new Set(draftIssues(original, knownTypes, now).map(issueKey));
    const merged = applySubscriptionPatch(original, patch, now);
    const issues = draftIssues(merged, knownTypes, now).filter((issue) => !existing.has(issueKey(issue)));
    const seen = new Set(issues.map(issueKey));
    return [...issues, ...brokerEditIssues(original, patch).filter((issue) => !seen.has(issueKey(issue)))];
}

export function updateSubscriptionDisabled(
    capabilities: Pick<Capabilities, "subscriptions">,
    original: Subscription | null,
    patch: SubscriptionPatch,
    knownTypes?: EntityTypeInfo[],
    now: number = Date.now(),
): UpdateSubscriptionRejection | null {
    if (!capabilities.subscriptions) return "no-subscriptions-adapter";
    if (!original) return "subscription-not-found";
    if (updateIssues(original, patch, knownTypes, now).length > 0) return "invalid-draft";
    return null;
}

export function setSubscriptionStatusDisabled(
    capabilities: Pick<Capabilities, "subscriptions">,
    subscriptions: Subscription[] | undefined,
    id: string,
    status: SubscriptionStatusChange,
): SetSubscriptionStatusRejection | null {
    if (!capabilities.subscriptions) return "no-subscriptions-adapter";
    if (!subscriptions) return null;
    const subscription = subscriptions.find((s) => s.id === id);
    if (!subscription) return "subscription-not-found";
    if (subscription.status === "expired") return "subscription-expired";
    if (subscription.status === status) return "status-unchanged";
    return null;
}

export function removeSubscriptionDisabled(
    capabilities: Pick<Capabilities, "subscriptions">,
    subscriptions: Subscription[] | undefined,
    id: string,
): RemoveSubscriptionRejection | null {
    if (!capabilities.subscriptions) return "no-subscriptions-adapter";
    if (subscriptions && !subscriptions.some((s) => s.id === id)) return "subscription-not-found";
    return null;
}

export function saveQueryDisabled(
    capabilities: Pick<Capabilities, "savedQueries">,
    query: Pick<SavedQuery, "name">,
): SaveQueryRejection | null {
    if (!capabilities.savedQueries) return "no-saved-queries-adapter";
    if (isBlank(query.name)) return "blank-name";
    return null;
}

export function updateSavedQueryDisabled(
    capabilities: Pick<Capabilities, "savedQueries">,
    savedQueries: SavedQuery[] | undefined,
    query: Pick<SavedQuery, "id" | "name">,
): UpdateSavedQueryRejection | null {
    if (!capabilities.savedQueries) return "no-saved-queries-adapter";
    if (isBlank(query.name)) return "blank-name";
    if (savedQueries && !savedQueries.some((q) => q.id === query.id)) return "saved-query-not-found";
    return null;
}

export function removeSavedQueryDisabled(
    capabilities: Pick<Capabilities, "savedQueries">,
    savedQueries: SavedQuery[] | undefined,
    id: string,
): RemoveSavedQueryRejection | null {
    if (!capabilities.savedQueries) return "no-saved-queries-adapter";
    if (savedQueries && !savedQueries.some((q) => q.id === id)) return "saved-query-not-found";
    return null;
}

const inRange = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;

export function setGeoFilterDisabled(geo: GeoFilter): SetGeoFilterRejection | null {
    if (!Number.isFinite(geo.radiusKm) || geo.radiusKm <= 0) return "invalid-radius";
    if (!inRange(geo.lat, -90, 90) || !inRange(geo.lon, -180, 180)) return "invalid-coordinates";
    return null;
}

const isPaging = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n >= 0);

export function setQueryDisabled(
    knownTypes: EntityTypeInfo[] | undefined,
    query: EntityQuery,
): SetQueryRejection | null {
    const typesReason = query.types ? selectTypesDisabled(knownTypes, query.types) : null;
    if (typesReason) return typesReason;
    if (query.q !== undefined && isBlank(query.q)) return "empty-q";
    if (query.geo && setGeoFilterDisabled(query.geo)) return "invalid-geo";
    if (!isPaging(query.limit) || !isPaging(query.offset)) return "invalid-paging";
    return null;
}
