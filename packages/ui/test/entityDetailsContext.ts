import type { EntityDetailsContextValue } from "../src/primitives/EntityDetails/EntityDetails.context";

export function fakeEntityDetailsContext(
    overrides: Partial<EntityDetailsContextValue> = {},
): EntityDetailsContextValue {
    return {
        entity: { id: "urn:ngsi-ld:Camera:camera-1", type: "Camera", status: { type: "Property", value: "on" } },
        stale: false,
        ...overrides,
    };
}
