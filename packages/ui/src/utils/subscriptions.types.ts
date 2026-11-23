import type { QueryBuilderGeo } from "../primitives/QueryBuilder/QueryBuilder.types";
export type SubscriptionStatus = "active" | "paused" | "expired";

export type SubscriptionTrigger =
    "entityCreated" | "entityUpdated" | "entityDeleted" | "attributeCreated" | "attributeUpdated" | "attributeDeleted";

export type SubscriptionDeliveryRecord = {
    status?: "ok" | "failed";
    timesSent?: number;
    timesFailed?: number;
    lastNotification?: string;
    lastSuccess?: string;
    lastFailure?: string;
};

export type SubscriptionNotificationFormat = "normalized" | "concise" | "keyValues";

export type SubscriptionJoin = "flat" | "inline";

export type SubscriptionPayloadRecord = {
    format: SubscriptionNotificationFormat;
    pick?: string[];
    omit?: string[];
    showChanges?: boolean;
    sysAttrs?: boolean;
    join?: SubscriptionJoin;
    joinLevel?: number;
};

export type SubscriptionEndpointRecord = {
    uri: string;
    accept?: string;
};

export type SubscriptionRecord = {
    id: string;
    name?: string;
    description?: string;
    expiresAt?: string;
    types: string[];
    watchedAttributes: string[];
    q?: string;
    geo?: QueryBuilderGeo;
    payload?: SubscriptionPayloadRecord;
    status: SubscriptionStatus;
    endpoint?: SubscriptionEndpointRecord;
    delivery?: SubscriptionDeliveryRecord;
    unreadable?: string[];
    idSelectors?: boolean;
};

export type NotificationRecord = {
    id: string;
    subscriptionId: string;
    receivedAt: string;
    status: "delivered" | "failed";
    source?: string;
    payload: unknown;
};

export type SubscriptionEditorNotify = {
    kind: "onChange" | "every";
    triggers: SubscriptionTrigger[];
    throttling?: number;
    seconds?: number;
};

export type SubscriptionEditorPayload = {
    format: SubscriptionNotificationFormat;
    pick: string[];
    omit: string[];
    showChanges: boolean;
    sysAttrs: boolean;
    join: SubscriptionJoin | "";
    joinLevel?: number;
};

export type SubscriptionEditorValues = {
    name: string;
    description: string;
    watchedAttributes: string[];
    notify: SubscriptionEditorNotify;
    expiresAt: string;
    scopeQ: string;
    lang: string;
    payload: SubscriptionEditorPayload;
    jsonldContext: string;
    expandValues: string[];
    jsonKeys: string[];
    endpoint: string;
};
