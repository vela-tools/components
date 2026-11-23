import type { EntityQuery, EntitySource, EntityTypeInfo, NgsiLdAttribute, NgsiLdEntity } from "@vela-tools/ngsi";
import type { NgsiLdClientConfig } from "./config";
import { NgsiClientError, type Http } from "./http";
import { toGeoQuery } from "./geo";
import { contextFromLink, fromTypeRef, toTypeRef } from "./iri";
import { entitySchema, reasonOf, typeDetailsSchema, typeInfoSchema, typeListSchema } from "./schemas";
import { createSegmentGetter } from "./segments";

export const CORE_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld";
const KINDS: NgsiLdAttribute["type"][] = ["Property", "GeoProperty", "Relationship"];
const GEO_ATTRIBUTES = new Set(["location", "observationSpace", "operationSpace"]);
const DETAILS_CONCURRENCY = 4;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

export class NgsiValidationError extends Error {
    constructor(
        message: string,
        readonly value: unknown,
    ) {
        super(message);
        this.name = "NgsiValidationError";
    }
}

export function createEntitySource(http: Http, config: NgsiLdClientConfig): EntitySource {
    const contextOf = (headers: Headers) => config.context ?? contextFromLink(headers.get("link")) ?? CORE_CONTEXT;

    function validEntities(raw: unknown, headers: Headers): NgsiLdEntity[] {
        if (!Array.isArray(raw))
            throw new NgsiValidationError("The broker answered with something other than a list of entities.", raw);
        const context = contextOf(headers);
        return raw.flatMap((item) => {
            const r = entitySchema.safeParse(item);
            if (!r.success) {
                config.onInvalid?.({ kind: "entity", value: item, reason: reasonOf(r.error) });
                return [];
            }
            return [{ ...r.data, "@context": context }];
        });
    }

    const getBySegment = createSegmentGetter(http);

    async function typeNames(signal?: AbortSignal): Promise<string[]> {
        const { body } = await http.request("GET", "/types", { signal });
        const r = typeListSchema.safeParse(body);
        if (!r.success)
            throw new NgsiValidationError(
                `The broker's list of entity types can't be read: ${reasonOf(r.error)}`,
                body,
            );
        return r.data;
    }

    async function typeInfo(name: string, signal?: AbortSignal): Promise<EntityTypeInfo> {
        const ref = toTypeRef(name);
        try {
            const { body } = await getBySegment("/types", name, { signal });
            const r = typeInfoSchema.safeParse(body);
            if (!r.success) {
                config.onInvalid?.({ kind: "type", value: body, reason: reasonOf(r.error) });
                return { type: ref, attributes: [] };
            }
            return {
                type: ref,
                attributes: r.data.attributeDetails.map((a) => {
                    const t = a.attributeTypes?.[0];
                    return {
                        name: a.attributeName,
                        kind: KINDS.includes(t as NgsiLdAttribute["type"])
                            ? (t as NgsiLdAttribute["type"])
                            : "Property",
                    };
                }),
                count: r.data.entityCount,
            };
        } catch (e) {
            if (!(e instanceof NgsiClientError)) throw e;
            if (e.status !== 404)
                config.onInvalid?.({
                    kind: "type",
                    value: name,
                    reason: `its details could not be read: ${e.message}`,
                });
            return { type: ref, attributes: [] };
        }
    }

    return {
        async listTypes(opts) {
            const { body } = await http.request("GET", "/types", { signal: opts?.signal, query: { details: "true" } });
            const details = typeDetailsSchema.safeParse(body);
            if (details.success) {
                return details.data.map((t) => ({
                    type: toTypeRef(t.typeName),
                    attributes: t.attributeNames.map((name) => ({
                        name,
                        kind: GEO_ATTRIBUTES.has(name) ? ("GeoProperty" as const) : ("Property" as const),
                    })),
                }));
            }
            const names = typeListSchema.safeParse(body);
            if (!names.success)
                throw new NgsiValidationError(
                    `The broker's list of entity types can't be read: ${reasonOf(names.error)}`,
                    body,
                );
            return mapLimit(names.data, DETAILS_CONCURRENCY, (n) => typeInfo(n, opts?.signal));
        },

        async queryEntities(query: EntityQuery, opts) {
            let types = query.types?.map(fromTypeRef);
            if (!types?.length && !query.q && !query.geo) types = await typeNames(opts?.signal);
            const geo = query.geo && toGeoQuery(query.geo);
            const { body, headers } = await http.request("GET", "/entities", {
                signal: opts?.signal,
                query: {
                    type: types?.length ? types.join(",") : undefined,
                    q: query.q,
                    georel: geo?.georel,
                    geometry: geo?.geometry,
                    coordinates: geo ? JSON.stringify(geo.coordinates) : undefined,
                    limit: query.limit,
                    offset: query.offset,
                    count: "true",
                },
            });
            const count = Number(headers.get("ngsild-results-count"));
            return {
                entities: validEntities(body, headers),
                total: Number.isFinite(count) && headers.has("ngsild-results-count") ? count : undefined,
            };
        },

        async getEntity(id, opts) {
            try {
                const { body, headers } = await getBySegment("/entities", id, { signal: opts?.signal });
                const r = entitySchema.safeParse(body);
                if (!r.success) {
                    config.onInvalid?.({ kind: "entity", value: body, reason: reasonOf(r.error) });
                    throw new NgsiValidationError(
                        `Entity ${id} from the broker can't be read: ${reasonOf(r.error)}`,
                        body,
                    );
                }
                return { ...r.data, "@context": contextOf(headers) };
            } catch (e) {
                if (e instanceof NgsiClientError && e.status === 404) return null;
                throw e;
            }
        },
    };
}
