import type { BrokerInfo, NgsiAdapters } from "@vela-tools/ngsi";
import { createMockNgsiAdapter, defaultMockFixtures, type MockMethod } from "@vela-tools/ngsi/testing";
import { createNgsiLdAdapter } from "@vela-tools/ngsi-client";

export type AdapterMode = "mock" | "broker";

export const CAPABILITIES = ["subscriptions", "notifications", "savedQueries", "temporal", "live"] as const;
export type CapabilityKey = (typeof CAPABILITIES)[number];

export const MOCK_METHODS: MockMethod[] = [
    "entities.listTypes",
    "entities.queryEntities",
    "entities.getEntity",
    "subscriptions.list",
    "subscriptions.get",
    "subscriptions.create",
    "subscriptions.update",
    "subscriptions.setStatus",
    "subscriptions.remove",
    "notifications.list",
    "temporal.history",
    "savedQueries.list",
    "savedQueries.save",
    "savedQueries.update",
    "savedQueries.remove",
];

export type AdapterSettings = {
    mode: AdapterMode;
    latencyMs: [number, number];
    failOn: MockMethod[];
    capabilities: Record<CapabilityKey, boolean>;
};

export const brokerConfig = {
    url: import.meta.env.VITE_BROKER_URL || undefined,
    context: import.meta.env.VITE_BROKER_CONTEXT || undefined,
};

export const DEFAULT_CAPABILITIES: Record<AdapterMode, Record<CapabilityKey, boolean>> = {
    mock: { subscriptions: true, notifications: true, savedQueries: true, temporal: true, live: true },
    broker: { subscriptions: true, notifications: true, savedQueries: false, temporal: false, live: false },
};

export const DEFAULT_SETTINGS: AdapterSettings = {
    mode: "mock",
    latencyMs: [200, 800],
    failOn: [],
    capabilities: DEFAULT_CAPABILITIES.mock,
};

export function createAdapters(settings: AdapterSettings): NgsiAdapters {
    if (settings.mode === "broker" && brokerConfig.url) {
        return createNgsiLdAdapter({
            url: brokerConfig.url,
            context: brokerConfig.context,
            features: settings.capabilities,
        });
    }
    return createMockNgsiAdapter(defaultMockFixtures(), {
        latencyMs: settings.latencyMs,
        failOn: settings.failOn,
        capabilities: settings.capabilities,
    });
}

export function brokerInfo(settings: AdapterSettings, revision: number): BrokerInfo {
    if (settings.mode === "broker" && brokerConfig.url) {
        return { id: `broker-${revision}`, name: "Broker", url: brokerConfig.url };
    }
    return { id: `mock-${revision}`, name: "Mock adapter" };
}
