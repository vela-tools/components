import type {
    EntityQuery,
    EntityTypeInfo,
    NgsiLdEntity,
    Notification,
    SavedQuery,
    Subscription,
    SubscriptionDraft,
    SubscriptionPatch,
    SubscriptionStatusChange,
} from "./types";

export type AdapterOptions = { signal?: AbortSignal };

export interface EntitySource {
    listTypes(opts?: AdapterOptions): Promise<EntityTypeInfo[]>;
    queryEntities(query: EntityQuery, opts?: AdapterOptions): Promise<{ entities: NgsiLdEntity[]; total?: number }>;
    getEntity(id: string, opts?: AdapterOptions): Promise<NgsiLdEntity | null>;
}

export interface SubscriptionStore {
    list(opts?: AdapterOptions): Promise<Subscription[]>;
    get(id: string, opts?: AdapterOptions): Promise<Subscription | null>;
    create(draft: SubscriptionDraft, opts?: AdapterOptions): Promise<Subscription>;
    update(id: string, patch: SubscriptionPatch, opts?: AdapterOptions): Promise<void>;
    setStatus(id: string, status: SubscriptionStatusChange, opts?: AdapterOptions): Promise<void>;
    remove(id: string, opts?: AdapterOptions): Promise<void>;
}

export interface NotificationSource {
    list(query: { subscriptionId?: string; limit?: number }, opts?: AdapterOptions): Promise<Notification[]>;
}

export type TemporalQuery = { entityId: string; attrs: string[]; from: string; to: string; lastN?: number };

export interface TemporalSource {
    history(query: TemporalQuery, opts?: AdapterOptions): Promise<NgsiLdEntity>;
}

export interface LiveSource {
    watch(query: EntityQuery, onChange: (entities: NgsiLdEntity[]) => void): () => void;
}

export interface SavedQueryStore {
    list(opts?: AdapterOptions): Promise<SavedQuery[]>;
    save(query: Omit<SavedQuery, "id" | "createdAt">, opts?: AdapterOptions): Promise<SavedQuery>;
    update(query: SavedQuery, opts?: AdapterOptions): Promise<SavedQuery>;
    remove(id: string, opts?: AdapterOptions): Promise<void>;
}

export type NgsiAdapters = {
    entities: EntitySource;
    subscriptions?: SubscriptionStore;
    notifications?: NotificationSource;
    temporal?: TemporalSource;
    live?: LiveSource;
    savedQueries?: SavedQueryStore;
};
