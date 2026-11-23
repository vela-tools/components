import type { CellComponent } from "tabulator-tables";
import { lightenColor } from "./color";

export type EntityRecord = {
    id: string;
    type: string;
    [key: string]: unknown;
};

type AttributeRow = {
    key: string;
    type?: string;
    value: unknown;
    observedAt?: string;
};

type ColumnGroup = {
    type: string;
    attributes: string[];
};

type AttributeInstance = {
    type?: string;
    value?: unknown;
    object?: unknown;
    observedAt?: string;
    modifiedAt?: string;
    createdAt?: string;
};

const META_KEYS = new Set(["@context"]);
const ID_KEYS = new Set(["id", "type"]);

function displayValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === "object") return JSON.stringify(value);
    return value;
}

function instanceValue(attr: AttributeInstance): unknown {
    switch (attr.type) {
        case "GeoProperty": {
            const geo = attr.value as { type?: string; coordinates?: unknown } | undefined;
            return geo ? `${geo.type ?? ""} ${JSON.stringify(geo.coordinates ?? null)}` : undefined;
        }
        case "Relationship":
            return Array.isArray(attr.object) ? attr.object.join(", ") : attr.object;
        default:
            return displayValue(attr.value);
    }
}

function asInstances(raw: unknown): AttributeInstance[] {
    const list = Array.isArray(raw) ? raw : [raw];
    return list.filter((a): a is AttributeInstance => typeof a === "object" && a !== null);
}

export function entityAttributeRows(
    entity: EntityRecord | null | undefined,
    { includeIdAndType = false }: { includeIdAndType?: boolean } = {},
): AttributeRow[] {
    if (!entity) return [];
    const rows: AttributeRow[] = [];
    for (const [key, raw] of Object.entries(entity)) {
        if (META_KEYS.has(key)) continue;
        if (ID_KEYS.has(key)) {
            if (includeIdAndType) rows.push({ key, value: raw });
            continue;
        }
        const instances = asInstances(raw);
        if (instances.length === 0) {
            rows.push({ key, value: displayValue(raw) });
            continue;
        }
        const values = instances.map(instanceValue);
        const first = instances[0];
        rows.push({
            key,
            type: first.type,
            value: values.length === 1 ? values[0] : values.join(" | "),
            observedAt: first.observedAt ?? first.modifiedAt ?? first.createdAt,
        });
    }
    return rows;
}

export type EntityRow = Record<string, unknown> & { id: string; _raw: EntityRecord };

export function entityRows(entities: EntityRecord[]): EntityRow[] {
    return entities.map((entity) => {
        const row: EntityRow = { id: entity.id, _raw: entity };
        for (const attr of entityAttributeRows(entity, { includeIdAndType: true })) row[attr.key] = attr.value;
        return row;
    });
}

export function columnGroups(entities: EntityRecord[]): ColumnGroup[] {
    const groups = new Map<string, Set<string>>();
    for (const entity of entities) {
        const attrs = groups.get(entity.type) ?? new Set<string>();
        for (const key of Object.keys(entity)) {
            if (!META_KEYS.has(key) && !ID_KEYS.has(key)) attrs.add(key);
        }
        groups.set(entity.type, attrs);
    }
    return Array.from(groups, ([type, attrs]) => ({ type, attributes: Array.from(attrs) }));
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function typeBadgeFormatter(colors?: Record<string, string>) {
    return (cell: CellComponent): string => {
        const value = escapeHtml(String(cell.getValue() ?? ""));
        if (!colors) return value;
        const color = colors[cell.getValue() as string] ?? "#868e96";
        const background = lightenColor(color, 95);
        const border = lightenColor(color, 75);
        return `<span style="background:${background};color:${color};padding:0 8px;border-radius:4px;border:1px solid ${border};font-size:11px;font-weight:500;">${value}</span>`;
    };
}
