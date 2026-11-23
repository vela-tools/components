import type { ConnectionStatusContextValue } from "../src/primitives/ConnectionStatus/ConnectionStatus.context";

export function fakeConnectionStatusContext(
    overrides: Partial<ConnectionStatusContextValue> = {},
): ConnectionStatusContextValue {
    return {
        name: "Den Haag",
        url: "https://broker.example/ngsi-ld/v1",
        status: "connected",
        ...overrides,
    };
}
