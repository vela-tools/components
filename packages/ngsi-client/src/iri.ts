import type { EntityTypeRef } from "@vela-tools/ngsi";

export function toTypeRef(iri: string): EntityTypeRef {
    const i = Math.max(iri.lastIndexOf("/"), iri.lastIndexOf("#"));
    return i >= 0 && /^https?:\/\//.test(iri) && i < iri.length - 1
        ? { type: iri.slice(i + 1), contextUri: iri.slice(0, i + 1) }
        : { type: iri };
}

export function fromTypeRef(ref: EntityTypeRef): string {
    return (ref.contextUri ?? "") + ref.type;
}

function shortName(key: string): string {
    const i = Math.max(key.lastIndexOf("/"), key.lastIndexOf("#"));
    return /^https?:\/\//.test(key) && i >= 0 ? key.slice(i + 1) : key;
}

export function propertyValue(entity: Record<string, unknown>, name: string): unknown {
    const key = Object.keys(entity).find((k) => k === name || shortName(k) === name);
    const attr = key === undefined ? undefined : entity[key];
    const first = Array.isArray(attr) ? attr[0] : attr;
    return first && typeof first === "object" && "value" in first ? (first as { value: unknown }).value : undefined;
}

export function contextFromLink(link: string | null): string | undefined {
    if (!link) return undefined;
    for (const part of link.split(/,(?=\s*<)/)) {
        const m = part.match(/<([^>]+)>\s*;(.*)$/);
        if (m && /rel="?http:\/\/www\.w3\.org\/ns\/json-ld#context"?/.test(m[2])) return m[1];
    }
    return undefined;
}

export function isCoreContext(url: string): boolean {
    return /^https?:\/\/uri\.etsi\.org\/ngsi-ld\/v1\/ngsi-ld-core-context(-v[\d.]+)?\.jsonld$/.test(url);
}
