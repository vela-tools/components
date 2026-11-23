import type {
    QueryBuilderCondition,
    QueryBuilderGeo,
    QueryBuilderOperator,
    QueryBuilderType,
} from "./QueryBuilder.types";

export const DEFAULT_OPERATORS: QueryBuilderOperator[] = [">", ">=", "<", "<=", "==", "!=", "~="].map((op) => ({
    value: op,
    label: op,
}));

let nextConditionId = 0;

export function newQueryCondition(values: Partial<Omit<QueryBuilderCondition, "id">> = {}): QueryBuilderCondition {
    return { property: "", operator: ">", value: "", ...values, id: `qbc-${++nextConditionId}` };
}

export function filterTypes(types: QueryBuilderType[], search: string): QueryBuilderType[] {
    const q = search.trim().toLowerCase();
    return q ? types.filter((t) => t.label.toLowerCase().startsWith(q)) : types;
}

export function allTypesSelected(types: QueryBuilderType[], typeKeys: string[]): boolean {
    return types.length > 0 && types.every((t) => typeKeys.includes(t.key));
}

export function toggleTypeKey(typeKeys: string[], key: string): string[] {
    return typeKeys.includes(key) ? typeKeys.filter((k) => k !== key) : [...typeKeys, key];
}

export function totalCount(types: QueryBuilderType[]): number | undefined {
    const counts = types.flatMap((t) => (t.count === undefined ? [] : [t.count]));
    return counts.length ? counts.reduce((sum, n) => sum + n, 0) : undefined;
}

export function selectedProperties(types: QueryBuilderType[], typeKeys: string[]): string[] {
    return [...new Set(types.filter((t) => typeKeys.includes(t.key)).flatMap((t) => t.properties))];
}

export function updateCondition(
    conditions: QueryBuilderCondition[],
    id: string,
    field: keyof Omit<QueryBuilderCondition, "id">,
    value: string,
): QueryBuilderCondition[] {
    return conditions.map((c) => (c.id === id ? { ...c, [field]: value } : c));
}

export function removeCondition(conditions: QueryBuilderCondition[], id: string): QueryBuilderCondition[] {
    return conditions.length > 1 ? conditions.filter((c) => c.id !== id) : conditions;
}

export function geoLabel(geo: QueryBuilderGeo | null): string {
    if (!geo) return "No region set";
    return `${geo.label ?? `${geo.lat}°, ${geo.lon}°`} · ${geo.radiusKm} km`;
}

export function sameGeo(a: QueryBuilderGeo | null, b: QueryBuilderGeo | null): boolean {
    if (!a || !b) return a === b;
    return a.lat === b.lat && a.lon === b.lon && a.radiusKm === b.radiusKm && a.label === b.label;
}

const toNumber = (v: number | string) => (typeof v === "number" ? v : v.trim() === "" ? Number.NaN : Number(v));

export function geoFromInputs(
    lat: number | string,
    lon: number | string,
    radiusKm: number | string,
    label?: string,
): QueryBuilderGeo | null {
    const [la, lo, r] = [toNumber(lat), toNumber(lon), toNumber(radiusKm)];
    if (!Number.isFinite(la) || la < -90 || la > 90) return null;
    if (!Number.isFinite(lo) || lo < -180 || lo > 180) return null;
    if (!Number.isFinite(r) || r <= 0) return null;
    const name = label?.trim();
    return name ? { label: name, lat: la, lon: lo, radiusKm: r } : { lat: la, lon: lo, radiusKm: r };
}
