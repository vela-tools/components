import type { EntityQuery, EntityTypeRef, GeoFilter, SavedQuery, SavedQueryStore } from "@vela-tools/ngsi";
import type { NgsiLdClientConfig } from "./config";
import type { Http } from "./http";
import { randomUuid } from "./ids";
import { propertyValue } from "./iri";
import { allPages, truncatedReason } from "./pages";
import { entitySchema, reasonOf } from "./schemas";

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

function parseJson(text: unknown): unknown {
    if (typeof text !== "string" || !text) return undefined;
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function asGeo(v: unknown): GeoFilter | undefined {
    if (!isObject(v)) return undefined;
    const { lat, lon, radiusKm, label } = v;
    if (typeof lat !== "number" || typeof lon !== "number" || typeof radiusKm !== "number") return undefined;
    return { lat, lon, radiusKm, ...(typeof label === "string" && { label }) };
}

function asTypes(v: unknown): EntityTypeRef[] | undefined {
    if (!Array.isArray(v)) return undefined;
    const types = v.flatMap((t) =>
        isObject(t) && typeof t.type === "string"
            ? [{ type: t.type, ...(typeof t.contextUri === "string" && { contextUri: t.contextUri }) }]
            : [],
    );
    return types.length ? types : undefined;
}

function asQuery(v: unknown): EntityQuery {
    if (!isObject(v)) return {};
    const query: EntityQuery = {};
    const types = asTypes(v.types);
    if (types) query.types = types;
    if (typeof v.q === "string" && v.q) query.q = v.q;
    const geo = asGeo(v.geo);
    if (geo) query.geo = geo;
    if (typeof v.limit === "number") query.limit = v.limit;
    if (typeof v.offset === "number") query.offset = v.offset;
    return query;
}

function legacyQuery(e: Record<string, unknown>): EntityQuery {
    const query: EntityQuery = {};
    const types = asTypes(parseJson(propertyValue(e, "entityTypes")));
    if (types) query.types = types;
    const q = str(propertyValue(e, "query"))
        ?.split("&")
        .find((p) => p.startsWith("q="))
        ?.slice(2);
    if (q) query.q = q;
    const geo = asGeo(parseJson(propertyValue(e, "geoFilter")));
    if (geo) query.geo = geo;
    return query;
}

function toSavedQuery(e: Record<string, unknown> & { id: string }, systemCreatedAt: string | undefined): SavedQuery {
    const stored = parseJson(propertyValue(e, "entityQuery"));
    return {
        id: e.id,
        name: str(propertyValue(e, "name")) ?? "",
        query: stored === undefined ? legacyQuery(e) : asQuery(stored),
        createdAt: str(propertyValue(e, "createdAt")) ?? systemCreatedAt ?? "",
    };
}

const attributes = (q: Pick<SavedQuery, "name" | "query">) => ({
    name: { type: "Property", value: q.name },
    entityQuery: { type: "Property", value: JSON.stringify(q.query) },
});

export function createSavedQueryStore(http: Http, config: NgsiLdClientConfig): SavedQueryStore {
    const type = config.savedQueryEntityType ?? "SavedQuery";
    const entityPath = (id: string) => `/entities/${encodeURIComponent(id)}`;
    return {
        async list(opts) {
            const items = await allPages(http, "/entities", "saved query entities", {
                query: { type, options: "sysAttrs" },
                signal: opts?.signal,
                onTruncated: () =>
                    config.onInvalid?.({
                        kind: "savedQuery",
                        value: undefined,
                        reason: truncatedReason("saved queries"),
                    }),
            });
            return items
                .flatMap((item) => {
                    const { createdAt, modifiedAt: _modifiedAt, ...rest } = isObject(item) ? item : {};
                    const system = typeof createdAt === "string" ? createdAt : undefined;
                    const r = entitySchema.safeParse(
                        system === undefined && createdAt !== undefined ? { ...rest, createdAt } : rest,
                    );
                    if (!r.success) {
                        config.onInvalid?.({ kind: "savedQuery", value: item, reason: reasonOf(r.error) });
                        return [];
                    }
                    return [toSavedQuery(r.data, system)];
                })
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        },

        async save(query, opts) {
            const id = `urn:ngsi-ld:${type}:${randomUuid()}`;
            const createdAt = new Date().toISOString();
            await http.request("POST", "/entities", { signal: opts?.signal, body: { id, type, ...attributes(query) } });
            return { ...query, id, createdAt };
        },

        async update(query, opts) {
            await http.request("POST", `${entityPath(query.id)}/attrs`, {
                signal: opts?.signal,
                body: attributes(query),
            });
            return query;
        },

        async remove(id, opts) {
            await http.request("DELETE", entityPath(id), { signal: opts?.signal });
        },
    };
}
