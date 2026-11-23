import type { GeoJSON } from "geojson";

export type NgsiLdEntity = {
    id: string;
    type: string;
    "@context": string;
    [attr: string]: unknown;
};

export type NgsiLdAttribute =
    | {
          type: "Property";
          value: unknown;
          observedAt?: string;
          modifiedAt?: string;
          createdAt?: string;
          unitCode?: string;
      }
    | {
          type: "GeoProperty";
          value: GeoJSON;
          observedAt?: string;
          modifiedAt?: string;
          createdAt?: string;
      }
    | {
          type: "Relationship";
          object: string | string[];
          observedAt?: string;
          modifiedAt?: string;
          createdAt?: string;
      };

export type EntityTypeRef = { type: string; contextUri?: string };

export type EntityTypeInfo = {
    type: EntityTypeRef;
    attributes: { name: string; kind: NgsiLdAttribute["type"] }[];
    count?: number;
};

export type GeoFilter = {
    label?: string;
    lat: number;
    lon: number;
    radiusKm: number;
};

export type EntityQuery = {
    types?: EntityTypeRef[];
    q?: string;
    geo?: GeoFilter;
    limit?: number;
    offset?: number;
};

export type NotificationTrigger =
    "entityCreated" | "entityUpdated" | "entityDeleted" | "attributeCreated" | "attributeUpdated" | "attributeDeleted";

export type SubscriptionNotify =
    { kind: "onChange"; triggers?: NotificationTrigger[]; throttling?: number } | { kind: "every"; seconds: number };

export type NotificationFormat = "normalized" | "concise" | "keyValues";

type NotificationJoin = "flat" | "inline";

export type NotificationPayload = {
    format: NotificationFormat;
    pick?: string[];
    omit?: string[];
    showChanges?: boolean;
    sysAttrs?: boolean;
    join?: NotificationJoin;
    joinLevel?: number;
};

export type NotificationEndpoint = {
    uri: string;
    accept?: string;
};

export type SubscriptionDelivery = {
    status?: "ok" | "failed";
    timesSent?: number;
    timesFailed?: number;
    lastNotification?: string;
    lastSuccess?: string;
    lastFailure?: string;
};

export type Subscription = {
    id: string;
    name?: string;
    description?: string;
    types: EntityTypeRef[];
    watchedAttributes: string[];
    q?: string;
    geo?: GeoFilter;
    scopeQ?: string;
    notify?: SubscriptionNotify;
    expiresAt?: string;
    lang?: string;
    payload?: NotificationPayload;
    jsonldContext?: string;
    expandValues?: string[];
    jsonKeys?: string[];
    status: "active" | "paused" | "expired";
    endpoint?: NotificationEndpoint;
    delivery?: SubscriptionDelivery;
    unreadable?: SubscriptionUnreadable[];
    selectors?: SubscriptionEntitySelector[];
};

export type SubscriptionEntitySelector = {
    type: EntityTypeRef;
    id?: string;
    idPattern?: string;
};

export type SubscriptionUnreadable = {
    member: string;
    field: Exclude<keyof Subscription, "id" | "unreadable" | "selectors">;
};

export type SubscriptionStatusChange = Exclude<Subscription["status"], "expired">;

export type SubscriptionDraft = Omit<Subscription, "id" | "status" | "delivery" | "unreadable" | "selectors">;

export type ClearableSubscriptionMember =
    | "name"
    | "description"
    | "q"
    | "geo"
    | "scopeQ"
    | "notify"
    | "expiresAt"
    | "lang"
    | "payload"
    | "jsonldContext"
    | "expandValues"
    | "jsonKeys";

export type SubscriptionPatch = Partial<Omit<SubscriptionDraft, ClearableSubscriptionMember>> & {
    [K in ClearableSubscriptionMember]?: SubscriptionDraft[K] | null;
} & {
    status?: SubscriptionStatusChange;
};

export type Notification = {
    id: string;
    subscriptionId: string;
    receivedAt: string;
    status: "delivered" | "failed";
    source?: string;
    payload: unknown;
};

export type SavedQuery = {
    id: string;
    name: string;
    query: EntityQuery;
    createdAt: string;
};
