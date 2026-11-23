import type { EntityQuery, EntityTypeRef, GeoFilter } from "../types";

export type QueryCondition = { property: string; operator: string; value: string };

export type NgsiQueryInput = {
    types?: EntityTypeRef[];
    conditions?: QueryCondition[];
    q?: string;
    geo?: GeoFilter | null;
    limit?: number;
    offset?: number;
};

const fullType = (t: EntityTypeRef) => `${t.contextUri ?? ""}${t.type}`;

export function buildNgsiQuery(input: NgsiQueryInput): string {
    const parts: string[] = [];
    if (input.types?.length) parts.push(`type=${input.types.map(fullType).join(",")}`);

    const valid = (input.conditions ?? []).filter((c) => c.property && c.operator && c.value);
    const q = [input.q, ...valid.map((c) => `${c.property}${c.operator}${c.value}`)].filter(Boolean).join(";");
    if (q) parts.push(`q=${q}`);

    if (input.geo) {
        parts.push("geometry=Point");
        parts.push(`coordinates=[${input.geo.lon},${input.geo.lat}]`);
        parts.push(`georel=near;maxDistance==${Math.round(input.geo.radiusKm * 1000)}`);
    }
    if (input.limit !== undefined) parts.push(`limit=${input.limit}`);
    if (input.offset !== undefined) parts.push(`offset=${input.offset}`);
    return parts.join("&");
}

export class QueryParseError extends Error {
    constructor(
        message: string,
        readonly query: string,
    ) {
        super(message);
        this.name = "QueryParseError";
    }
}

const KNOWN = new Set(["type", "q", "georel", "geometry", "coordinates", "limit", "offset"]);

function decode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function parsePoint(value: string | undefined): [number, number] | null {
    if (!value) return null;
    try {
        const p: unknown = JSON.parse(value);
        return Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number") ? [p[0], p[1]] : null;
    } catch {
        return null;
    }
}

export function parseNgsiQuery(query: string, knownTypes: EntityTypeRef[] = []): EntityQuery {
    const params = new Map<string, string>();
    for (const part of query.split("&")) {
        if (!part.trim()) continue;
        const at = part.indexOf("=");
        params.set((at < 0 ? part : part.slice(0, at)).trim(), decode(at < 0 ? "" : part.slice(at + 1)));
    }

    const unsupported = [...params.keys()].filter((k) => !KNOWN.has(k));
    if (unsupported.length) throw new QueryParseError(`Not supported in the query: ${unsupported.join(", ")}`, query);

    const result: EntityQuery = {};
    const type = params.get("type");
    if (type)
        result.types = type.split(",").map((name) => knownTypes.find((t) => fullType(t) === name) ?? { type: name });
    const q = params.get("q");
    if (q) result.q = q;

    const georel = params.get("georel");
    const coordinates = params.get("coordinates");
    if (georel || coordinates) {
        const distance = /^near;maxDistance==(\d+(?:\.\d+)?)$/.exec(georel ?? "");
        const point = parsePoint(coordinates);
        const geometry = params.get("geometry");
        if (!distance || !point || (geometry && geometry !== "Point")) {
            throw new QueryParseError(
                'Only "georel=near;maxDistance==<metres>" around a Point is supported in the query',
                query,
            );
        }
        result.geo = { lat: point[1], lon: point[0], radiusKm: Number(distance[1]) / 1000 };
    }

    for (const key of ["limit", "offset"] as const) {
        const value = params.get(key);
        if (value === undefined) continue;
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0)
            throw new QueryParseError(`"${key}" must be a whole number in the query`, query);
        result[key] = n;
    }
    return result;
}

export function parseConditions(q: string): QueryCondition[] {
    return q
        .split(";")
        .map((s) => /^(.+?)(>=|<=|==|!=|~=|>|<)(.+)$/.exec(s.trim()))
        .flatMap((m) => (m ? [{ property: m[1], operator: m[2], value: m[3] }] : []));
}
