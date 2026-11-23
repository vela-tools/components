import { vi } from "vitest";
import type { EntityTableContextValue } from "../src/primitives/EntityTable/EntityTable.context";
import type { EntityRecord } from "../src/utils/entity";

const tableEntities: EntityRecord[] = [
    { id: "urn:ngsi-ld:Camera:camera-1", type: "Camera", status: { type: "Property", value: "on" } },
    { id: "urn:ngsi-ld:Sensor:S01", type: "Sensor", humidity: { type: "Property", value: 40 } },
];

export function fakeEntityTableContext(overrides: Partial<EntityTableContextValue> = {}): EntityTableContextValue {
    return {
        entities: tableEntities,
        defaultColumns: ["id", "type"],
        columns: ["id", "type"],
        setColumns: vi.fn(),
        selectedId: null,
        select: vi.fn(),
        showFilters: false,
        setShowFilters: vi.fn(),
        pageSize: 10,
        stale: false,
        ...overrides,
    };
}
