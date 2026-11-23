export type NgsiLdClientConfig = {
    url: string;
    tenant?: string;
    context?: string;
    getToken?: () => string | null | undefined | Promise<string | null | undefined>;
    headers?: Record<string, string>;
    notificationEntityType?: string;
    liveIntervalMs?: number;
    onLiveError?: (error: unknown) => void;
    savedQueryEntityType?: string;
    onInvalid?: (item: InvalidItem) => void;
    fetch?: typeof fetch;
};

export type InvalidItem = {
    kind: "entity" | "type" | "subscription" | "notification" | "savedQuery";
    value: unknown;
    reason: string;
};
