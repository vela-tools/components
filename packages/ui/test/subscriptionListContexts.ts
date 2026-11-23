import { vi } from "vitest";
import type { NotificationRecord, SubscriptionRecord } from "../src/utils/subscriptions.types";
import type { NotificationListContextValue } from "../src/primitives/NotificationList/NotificationList.context";
import type { SubscriptionListContextValue } from "../src/primitives/SubscriptionList/SubscriptionList.context";

export const subscriptions: SubscriptionRecord[] = [
    {
        id: "urn:ngsi-ld:Subscription:1",
        name: "Hot camera",
        description: "Cameras running above 30 degrees",
        expiresAt: "2027-01-15T09:30:00Z",
        types: ["Camera", "Sensor"],
        watchedAttributes: ["temperature"],
        q: "temperature>30",
        status: "active",
        delivery: {
            status: "failed",
            timesSent: 4,
            timesFailed: 2,
            lastNotification: "2026-11-13T10:00:00Z",
            lastFailure: "2026-11-13T10:00:00Z",
        },
    },
    {
        id: "urn:ngsi-ld:Subscription:2",
        description: "Dry sensor",
        types: ["Sensor"],
        watchedAttributes: [],
        geo: { label: "Delft", lat: 52.01, lon: 4.36, radiusKm: 2 },
        status: "paused",
    },
];

const notifications: NotificationRecord[] = [
    {
        id: "n1",
        subscriptionId: "urn:ngsi-ld:Subscription:1",
        receivedAt: "2026-11-13T10:00:00Z",
        status: "delivered",
        source: "urn:ngsi-ld:Camera:camera-1",
        payload: { temperature: 31 },
    },
    {
        id: "n2",
        subscriptionId: "urn:ngsi-ld:Subscription:9",
        receivedAt: "2026-11-13T11:00:00Z",
        status: "failed",
        payload: "timeout",
    },
];

export function fakeSubscriptionListContext(
    overrides: Partial<SubscriptionListContextValue> = {},
): SubscriptionListContextValue {
    return {
        subscriptions,
        selectedId: null,
        select: vi.fn(),
        toggleStatus: vi.fn(),
        remove: vi.fn(),
        pendingIds: [],
        stale: false,
        ...overrides,
    };
}

export function fakeNotificationListContext(
    overrides: Partial<NotificationListContextValue> = {},
): NotificationListContextValue {
    return {
        notifications,
        subscriptionNames: { "urn:ngsi-ld:Subscription:1": "Hot camera" },
        stale: false,
        ...overrides,
    };
}
