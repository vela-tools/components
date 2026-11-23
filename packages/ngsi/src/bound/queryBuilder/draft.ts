import {
    generateTypeColors,
    newQueryCondition,
    type QueryBuilderCondition,
    type QueryBuilderDraft,
    type QueryBuilderSavedItem,
    type QueryBuilderType,
} from "@vela-tools/ui";
import { buildNgsiQuery, parseConditions, parseNgsiQuery, QueryParseError } from "../../query/ngsiQuery";
import type { EntityQuery, EntityTypeInfo, EntityTypeRef, SavedQuery } from "../../types";

const SEPARATOR = "|";

export const typeKey = (ref: EntityTypeRef): string => `${ref.contextUri ?? ""}${SEPARATOR}${ref.type}`;

function refFromKey(key: string): EntityTypeRef {
    const at = key.lastIndexOf(SEPARATOR);
    const contextUri = at < 0 ? "" : key.slice(0, at);
    const type = at < 0 ? key : key.slice(at + 1);
    return contextUri ? { type, contextUri } : { type };
}

export function toBuilderTypes(infos: EntityTypeInfo[]): QueryBuilderType[] {
    const colors = generateTypeColors(infos.map((info) => info.type.type));
    return infos.map((info) => ({
        key: typeKey(info.type),
        label: info.type.type,
        count: info.count,
        color: colors[info.type.type],
        properties: info.attributes.filter((a) => a.kind === "Property").map((a) => a.name),
    }));
}

export function emptyDraft(): QueryBuilderDraft {
    return { typeKeys: [], mode: "builder", conditions: [newQueryCondition()], text: "", geo: null };
}

export type DraftResult = { ok: true; query: EntityQuery } | { ok: false; error: string };

const isComplete = (c: QueryBuilderCondition) => !!(c.property && c.operator && c.value);

export function conditionProperties(draft: QueryBuilderDraft): string[] {
    if (draft.mode !== "builder") return [];
    return [...new Set(draft.conditions.filter(isComplete).map((c) => c.property))];
}

export function clearConditions(draft: QueryBuilderDraft): QueryBuilderDraft {
    return { ...draft, conditions: [newQueryCondition()] };
}

function builderQuery(draft: QueryBuilderDraft): EntityQuery {
    const query: EntityQuery = {};
    if (draft.typeKeys.length) query.types = draft.typeKeys.map(refFromKey);
    const q = draft.conditions
        .filter(isComplete)
        .map((c) => `${c.property}${c.operator}${c.value}`)
        .join(";");
    if (q) query.q = q;
    if (draft.geo) query.geo = { ...draft.geo };
    return query;
}

export function draftToQuery(draft: QueryBuilderDraft, knownTypes: EntityTypeRef[] = []): DraftResult {
    if (draft.mode === "builder") return { ok: true, query: builderQuery(draft) };
    try {
        return { ok: true, query: parseNgsiQuery(draft.text.trim(), knownTypes) };
    } catch (error) {
        if (error instanceof QueryParseError) return { ok: false, error: error.message };
        throw error;
    }
}

export function previewOf(draft: QueryBuilderDraft): string {
    if (draft.mode === "text") return draft.text;
    const query = builderQuery(draft);
    return buildNgsiQuery({ types: query.types, q: query.q, geo: query.geo });
}

export function queryToDraft(query: EntityQuery): QueryBuilderDraft {
    const typeKeys = (query.types ?? []).map(typeKey);
    const geo = query.geo ? { ...query.geo } : null;
    const rows = query.q ? parseConditions(query.q) : [];
    const rebuilt = rows.map((r) => `${r.property}${r.operator}${r.value}`).join(";");
    const fitsRows = !query.q || (!/[|()]/.test(query.q) && rebuilt === query.q.trim());
    const fitsBuilder = fitsRows && query.limit === undefined && query.offset === undefined;
    const conditions = rows.length ? rows.map((r) => newQueryCondition(r)) : [newQueryCondition()];

    if (fitsBuilder) return { typeKeys, mode: "builder", conditions, text: "", geo };
    return { typeKeys, mode: "text", conditions, text: buildNgsiQuery(query), geo };
}

export function followActiveQuery(draft: QueryBuilderDraft, active: EntityQuery): QueryBuilderDraft {
    if (draft.mode === "text") return draft;
    return { ...draft, typeKeys: (active.types ?? []).map(typeKey), geo: active.geo ? { ...active.geo } : null };
}

export function toSavedItem(saved: SavedQuery): QueryBuilderSavedItem {
    const { types, q, geo } = saved.query;
    const parts = [types?.length ? types.map((t) => t.type).join(", ") : "(all types)"];
    if (q) parts.push(q);
    if (geo) parts.push(`${geo.label ?? `${geo.lat}, ${geo.lon}`} ${geo.radiusKm} km`);
    return { id: saved.id, name: saved.name, createdAt: saved.createdAt, description: parts.join(" · ") };
}
