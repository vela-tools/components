import type { NgsiBroker, NgsiBrokerState } from "./brokers";

const isString = (value: unknown): value is string => typeof value === "string";

function parseBroker(value: unknown): NgsiBroker | null {
    if (!value || typeof value !== "object") return null;
    const { id, name, url, contextUrl } = value as Record<string, unknown>;
    if (!isString(id) || !isString(name) || !isString(url) || !id || !name || !url) return null;
    if (contextUrl !== undefined && !isString(contextUrl)) return null;
    return { id, name, url, ...(contextUrl ? { contextUrl } : {}) };
}

export function loadBrokerState(key: string): NgsiBrokerState | null {
    try {
        const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
        if (!raw || typeof raw !== "object") return null;
        const { brokers, selectedId } = raw as Record<string, unknown>;
        if (!Array.isArray(brokers)) return null;
        const parsed = brokers.map(parseBroker).filter((b): b is NgsiBroker => b !== null);
        if (parsed.length === 0) return null;
        const selected = parsed.find((b) => b.id === selectedId) ?? parsed[0];
        return { brokers: parsed, selectedId: selected.id };
    } catch {
        return null;
    }
}

export function saveBrokerState(key: string, state: NgsiBrokerState): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(state));
        return true;
    } catch {
        return false;
    }
}
