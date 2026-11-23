import type {
    SubscriptionEditorValues,
    SubscriptionNotificationFormat,
    SubscriptionRecord,
} from "./subscriptions.types";

export const emptyEditorValues: SubscriptionEditorValues = {
    name: "",
    description: "",
    watchedAttributes: [],
    notify: { kind: "onChange", triggers: [] },
    expiresAt: "",
    scopeQ: "",
    lang: "",
    payload: { format: "keyValues", pick: [], omit: [], showChanges: false, sysAttrs: false, join: "" },
    jsonldContext: "",
    expandValues: [],
    jsonKeys: [],
    endpoint: "",
};

export const NOTIFICATION_FORMATS: { value: SubscriptionNotificationFormat; label: string }[] = [
    { value: "normalized", label: "Normalized" },
    { value: "concise", label: "Concise" },
    { value: "keyValues", label: "Key-values" },
];

export function formatLabel(format: SubscriptionNotificationFormat): string {
    return NOTIFICATION_FORMATS.find((f) => f.value === format)?.label ?? format;
}

export function subscriptionTitle(subscription: Pick<SubscriptionRecord, "id" | "name" | "description">): string {
    return subscription.name || subscription.description || subscription.id;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(value: string | null | undefined): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

export function toLocalDateTime(iso: string): string {
    const date = new Date(iso);
    if (!iso || Number.isNaN(date.getTime())) return "";
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

export function fromLocalDateTime(local: string): string {
    const date = new Date(local);
    return !local || Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function shortEntityId(id: string | undefined): string {
    return id ? id.replace(/^urn:ngsi-ld:/, "") : "";
}

export function formatPayload(payload: unknown): string {
    if (payload === undefined || payload === null) return "";
    if (typeof payload === "string") return payload;
    return JSON.stringify(payload);
}

export function pageCount(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(total / pageSize));
}

export function pageItems<T>(items: T[], page: number, pageSize: number): T[] {
    const current = Math.min(Math.max(page, 1), pageCount(items.length, pageSize));
    return items.slice((current - 1) * pageSize, current * pageSize);
}
