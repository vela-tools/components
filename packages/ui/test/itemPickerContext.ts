import { vi } from "vitest";
import type { ItemPickerContextValue } from "../src/primitives/ItemPicker/ItemPicker.context";

export type Fruit = { id: string; name: string };

const fruits: Fruit[] = [
    { id: "a", name: "Apple" },
    { id: "b", name: "Banana" },
    { id: "c", name: "Cherry" },
];

export function fakeItemPickerContext(
    overrides: Partial<ItemPickerContextValue<Fruit>> = {},
): ItemPickerContextValue<Fruit> {
    return {
        items: fruits,
        getId: (fruit) => fruit.id,
        getName: (fruit) => fruit.name,
        selectedId: null,
        select: vi.fn(),
        use: vi.fn(),
        loading: false,
        stale: false,
        emptyText: "No fruit",
        ...overrides,
    };
}
