import type { NotificationSource } from "../adapters";
import type { EntityQuery } from "../types";

export type NotificationQuery = Parameters<NotificationSource["list"]>[0];

export const ngsiKeys = {
    all: (brokerId: string) => ["ngsi", brokerId] as const,
    types: (brokerId: string) => ["ngsi", brokerId, "types"] as const,
    entityLists: (brokerId: string) => ["ngsi", brokerId, "entities"] as const,
    entities: (brokerId: string, query: EntityQuery) => ["ngsi", brokerId, "entities", query] as const,
    entityById: (brokerId: string) => ["ngsi", brokerId, "entity"] as const,
    entity: (brokerId: string, entityId: string | null) => ["ngsi", brokerId, "entity", entityId] as const,
    subscriptions: (brokerId: string) => ["ngsi", brokerId, "subscriptions"] as const,
    notificationLists: (brokerId: string) => ["ngsi", brokerId, "notifications"] as const,
    notifications: (brokerId: string, query: NotificationQuery) => ["ngsi", brokerId, "notifications", query] as const,
    savedQueries: (brokerId: string) => ["ngsi", brokerId, "savedQueries"] as const,
};
