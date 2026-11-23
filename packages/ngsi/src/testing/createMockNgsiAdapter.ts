import type { AdapterOptions, NgsiAdapters, TemporalQuery } from "../adapters";
import type {
    EntityQuery,
    EntityTypeInfo,
    EntityTypeRef,
    NgsiLdAttribute,
    NgsiLdEntity,
    Notification,
    SavedQuery,
    Subscription,
} from "../types";
import {
    fixtureEntities,
    fixtureTypes,
    fixtureNotifications,
    fixtureSavedQueries,
    fixtureSubscriptions,
    fixtureTemporal,
} from "./fixtures";
import { applySubscriptionPatch } from "../runtime/subscriptionPatch";

export type MockFixtures = {
    entities: NgsiLdEntity[];
    types?: EntityTypeInfo[];
    typeRefs?: EntityTypeRef[];
    subscriptions?: Subscription[];
    notifications?: Notification[];
    savedQueries?: SavedQuery[];
    temporal?: Record<string, NgsiLdEntity>;
};

export type MockMethod =
    | "entities.listTypes"
    | "entities.queryEntities"
    | "entities.getEntity"
    | "subscriptions.list"
    | "subscriptions.get"
    | "subscriptions.create"
    | "subscriptions.update"
    | "subscriptions.setStatus"
    | "subscriptions.remove"
    | "notifications.list"
    | "temporal.history"
    | "savedQueries.list"
    | "savedQueries.save"
    | "savedQueries.update"
    | "savedQueries.remove";

export type MockAdapterOptions = {
    latencyMs?: number | [number, number];
    failOn?: MockMethod[] | ((method: MockMethod, args: unknown[]) => boolean | Error);
    capabilities?: Partial<Record<Exclude<keyof NgsiAdapters, "entities">, boolean>>;
    liveIntervalMs?: number;
};

export class MockAdapterError extends Error {
    constructor(
        readonly method: MockMethod,
        message: string,
    ) {
        super(`${method}: ${message}`);
        this.name = "MockAdapterError";
    }
}

const clone = <T>(v: T): T => structuredClone(v);

function abortError(): Error {
    return new DOMException("The operation was aborted.", "AbortError");
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError());
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(t);
            reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

function instances(value: unknown): NgsiLdAttribute[] {
    const list = Array.isArray(value) ? value : [value];
    return list.filter((v): v is NgsiLdAttribute => !!v && typeof v === "object" && "type" in v);
}

function attributesOf(entity: NgsiLdEntity): [string, NgsiLdAttribute[]][] {
    return Object.entries(entity)
        .filter(([k]) => k !== "id" && k !== "type" && k !== "@context")
        .map(([k, v]) => [k, instances(v)] as [string, NgsiLdAttribute[]])
        .filter(([, list]) => list.length > 0);
}

function deriveTypes(entities: NgsiLdEntity[], refs: Map<string, EntityTypeRef>): EntityTypeInfo[] {
    const byType = new Map<string, { attrs: Map<string, NgsiLdAttribute["type"]>; count: number }>();
    for (const e of entities) {
        const entry = byType.get(e.type) ?? { attrs: new Map(), count: 0 };
        entry.count++;
        for (const [name, list] of attributesOf(e)) entry.attrs.set(name, list[0].type);
        byType.set(e.type, entry);
    }
    return [...byType].map(([type, { attrs, count }]) => ({
        type: refs.get(type) ?? { type },
        attributes: [...attrs].map(([name, kind]) => ({ name, kind })),
        count,
    }));
}

type Term = { attr: string; op: string; value: string | number };

function parseQ(method: MockMethod, q: string): Term[] {
    return q.split(";").map((raw) => {
        const m = raw.trim().match(/^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
        if (!m) throw new MockAdapterError(method, `unsupported q term: "${raw}"`);
        const v = m[3].trim();
        const value = /^".*"$/.test(v) ? v.slice(1, -1) : Number.isFinite(Number(v)) ? Number(v) : v;
        return { attr: m[1], op: m[2], value };
    });
}

function compare(a: unknown, op: string, b: string | number): boolean {
    if (typeof b === "number" && typeof a !== "number") return false;
    switch (op) {
        case "==":
            return a === b;
        case "!=":
            return a !== b;
        case ">":
            return (a as number) > (b as number);
        case ">=":
            return (a as number) >= (b as number);
        case "<":
            return (a as number) < (b as number);
        case "<=":
            return (a as number) <= (b as number);
        default:
            return false;
    }
}

function matchesQ(entity: NgsiLdEntity, terms: Term[]): boolean {
    return terms.every(({ attr, op, value }) =>
        instances(entity[attr]).some((i) => i.type === "Property" && compare(i.value, op, value)),
    );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const a =
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function positions(geometry: unknown): [number, number][] {
    const g = geometry as { type?: string; coordinates?: unknown };
    const flat = (c: unknown): [number, number][] =>
        Array.isArray(c) && typeof c[0] === "number"
            ? [[c[0], c[1] as number]]
            : Array.isArray(c)
              ? c.flatMap(flat)
              : [];
    return g && typeof g === "object" ? flat(g.coordinates) : [];
}

function withinRadius(entity: NgsiLdEntity, geo: NonNullable<EntityQuery["geo"]>): boolean {
    return attributesOf(entity).some(([, list]) =>
        list.some(
            (i) =>
                i.type === "GeoProperty" &&
                positions(i.value).some(([lon, lat]) => haversineKm(geo.lat, geo.lon, lat, lon) <= geo.radiusKm),
        ),
    );
}

function sameType(ref: EntityTypeRef, type: string): boolean {
    return ref.type === type || (ref.contextUri ?? "") + ref.type === type;
}

export function createMockNgsiAdapter(
    fixtures: MockFixtures = defaultMockFixtures(),
    options: MockAdapterOptions = {},
): NgsiAdapters {
    const { latencyMs = 0, failOn, capabilities = {}, liveIntervalMs = 1000 } = options;

    const entities = clone(fixtures.entities);
    const subscriptions = clone(fixtures.subscriptions ?? []);
    const notifications = clone(fixtures.notifications ?? []);
    const savedQueries = clone(fixtures.savedQueries ?? []);
    const temporal = clone(fixtures.temporal ?? {});
    const refs = new Map<string, EntityTypeRef>(
        [...(fixtures.typeRefs ?? []), ...(fixtures.types ?? []).map((t) => t.type)].map((r) => [r.type, r]),
    );
    let nextId = 1;

    const pickDelay = () =>
        Array.isArray(latencyMs) ? latencyMs[0] + Math.random() * (latencyMs[1] - latencyMs[0]) : latencyMs;

    async function call<T>(
        method: MockMethod,
        args: unknown[],
        opts: AdapterOptions | undefined,
        run: () => T,
    ): Promise<T> {
        await delay(pickDelay(), opts?.signal);
        const fail = Array.isArray(failOn) ? failOn.includes(method) : failOn?.(method, args);
        if (fail) throw fail instanceof Error ? fail : new MockAdapterError(method, "failed (failOn)");
        return clone(run());
    }

    function query(q: EntityQuery) {
        const terms = q.q ? parseQ("entities.queryEntities", q.q) : [];
        const matched = entities.filter(
            (e) =>
                (!q.types?.length || q.types.some((t) => sameType(t, e.type))) &&
                matchesQ(e, terms) &&
                (!q.geo || withinRadius(e, q.geo)),
        );
        const offset = q.offset ?? 0;
        return {
            entities: matched.slice(offset, q.limit === undefined ? undefined : offset + q.limit),
            total: matched.length,
        };
    }

    const adapters: NgsiAdapters = {
        entities: {
            listTypes: (opts) =>
                call("entities.listTypes", [], opts, () => fixtures.types ?? deriveTypes(entities, refs)),
            queryEntities: (q, opts) => call("entities.queryEntities", [q], opts, () => query(q)),
            getEntity: (id, opts) =>
                call("entities.getEntity", [id], opts, () => entities.find((e) => e.id === id) ?? null),
        },
    };

    if (capabilities.subscriptions !== false) {
        const find = (method: MockMethod, id: string) => {
            const s = subscriptions.find((x) => x.id === id);
            if (!s) throw new MockAdapterError(method, `subscription ${id} not found`);
            return s;
        };
        adapters.subscriptions = {
            list: (opts) => call("subscriptions.list", [], opts, () => subscriptions),
            get: (id, opts) =>
                call("subscriptions.get", [id], opts, () => subscriptions.find((x) => x.id === id) ?? null),
            create: (draft, opts) =>
                call("subscriptions.create", [draft], opts, () => {
                    const s: Subscription = {
                        ...draft,
                        id: `urn:ngsi-ld:Subscription:mock-${nextId++}`,
                        status: "active",
                        delivery: { timesSent: 0 },
                    };
                    subscriptions.push(s);
                    return s;
                }),
            update: (id, patch, opts) =>
                call("subscriptions.update", [id, patch], opts, () => {
                    const index = subscriptions.indexOf(find("subscriptions.update", id));
                    subscriptions[index] = applySubscriptionPatch(subscriptions[index], patch);
                }),
            setStatus: (id, status, opts) =>
                call("subscriptions.setStatus", [id, status], opts, () => {
                    find("subscriptions.setStatus", id).status = status;
                }),
            remove: (id, opts) =>
                call("subscriptions.remove", [id], opts, () => {
                    subscriptions.splice(subscriptions.indexOf(find("subscriptions.remove", id)), 1);
                }),
        };
    }

    if (capabilities.notifications !== false) {
        adapters.notifications = {
            list: (q, opts) =>
                call("notifications.list", [q], opts, () => {
                    const list = notifications
                        .filter((n) => !q.subscriptionId || n.subscriptionId === q.subscriptionId)
                        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
                    return q.limit === undefined ? list : list.slice(0, q.limit);
                }),
        };
    }

    if (capabilities.temporal !== false) {
        adapters.temporal = {
            history: (q: TemporalQuery, opts) =>
                call("temporal.history", [q], opts, () => {
                    const series = temporal[q.entityId];
                    if (!series) throw new MockAdapterError("temporal.history", `no temporal data for ${q.entityId}`);
                    const result: NgsiLdEntity = { id: series.id, type: series.type, "@context": series["@context"] };
                    for (const attr of q.attrs) {
                        let list = instances(series[attr]).filter(
                            (i) => !i.observedAt || (i.observedAt >= q.from && i.observedAt <= q.to),
                        );
                        if (q.lastN !== undefined) list = list.slice(-q.lastN);
                        if (list.length) result[attr] = list;
                    }
                    return result;
                }),
        };
    }

    if (capabilities.live !== false) {
        adapters.live = {
            watch: (q, onChange) => {
                let stopped = false;
                const tick = () => {
                    if (!stopped) onChange(clone(query(q).entities));
                };
                const first = setTimeout(tick, 0);
                const timer = setInterval(tick, liveIntervalMs);
                return () => {
                    stopped = true;
                    clearTimeout(first);
                    clearInterval(timer);
                };
            },
        };
    }

    if (capabilities.savedQueries !== false) {
        const find = (method: MockMethod, id: string) => {
            const i = savedQueries.findIndex((x) => x.id === id);
            if (i < 0) throw new MockAdapterError(method, `saved query ${id} not found`);
            return i;
        };
        adapters.savedQueries = {
            list: (opts) => call("savedQueries.list", [], opts, () => savedQueries),
            save: (q, opts) =>
                call("savedQueries.save", [q], opts, () => {
                    const s: SavedQuery = { ...q, id: `mock-saved-${nextId++}`, createdAt: new Date().toISOString() };
                    savedQueries.push(s);
                    return s;
                }),
            update: (q, opts) =>
                call("savedQueries.update", [q], opts, () => {
                    savedQueries[find("savedQueries.update", q.id)] = q;
                    return q;
                }),
            remove: (id, opts) =>
                call("savedQueries.remove", [id], opts, () => {
                    savedQueries.splice(find("savedQueries.remove", id), 1);
                }),
        };
    }

    return adapters;
}

export function defaultMockFixtures(): MockFixtures {
    return clone({
        entities: fixtureEntities,
        typeRefs: Object.values(fixtureTypes),
        subscriptions: fixtureSubscriptions,
        notifications: fixtureNotifications,
        savedQueries: fixtureSavedQueries,
        temporal: fixtureTemporal,
    });
}
