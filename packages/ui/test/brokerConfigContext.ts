import { vi } from "vitest";
import type { BrokerConfigContextValue } from "../src/primitives/BrokerConfig/BrokerConfig.context";

export function fakeBrokerConfigContext(overrides: Partial<BrokerConfigContextValue> = {}): BrokerConfigContextValue {
    return {
        brokers: [
            { id: "a", name: "Den Haag", url: "https://a.example/ngsi-ld/v1" },
            { id: "b", name: "Rotterdam", url: "https://b.example/ngsi-ld/v1" },
        ],
        selectedId: "a",
        select: vi.fn(),
        fields: [
            { key: "name", label: "Broker name", required: true },
            { key: "url", label: "Broker URL", required: true },
            { key: "contextUrl", label: "Context URL" },
        ],
        valuesOf: (id) =>
            id === "a"
                ? { name: "Den Haag", url: "https://a.example/ngsi-ld/v1", contextUrl: "" }
                : { name: "", url: "", contextUrl: "https://context.example" },
        save: vi.fn(),
        remove: vi.fn(),
        ...overrides,
    };
}
