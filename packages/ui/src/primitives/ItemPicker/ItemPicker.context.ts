import { useMemo, type ReactNode } from "react";
import { createItemContext } from "../createItemContext";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type ItemPickerContextValue<T = unknown> = {
    items: readonly T[];
    getId: (item: T) => string;
    getName: (item: T) => string;
    selectedId: string | null;
    select: (id: string | null) => void;
    use?: (id: string) => void;
    loading: boolean;
    stale: boolean;
    error?: ReactNode;
    emptyText?: ReactNode;
};

type ItemPickerFilterValue = {
    filter: string;
    setFilter: (filter: string) => void;
};

export const [ItemPickerContextProvider, useItemPickerContext] =
    createPrimitiveContext<ItemPickerContextValue>("ItemPicker");

export const [ItemPickerFilterProvider, useItemPickerFilter] =
    createPrimitiveContext<ItemPickerFilterValue>("ItemPicker");

export const [ItemPickerItemProvider, useItemPickerItem] = createItemContext<unknown>("ItemPicker", "ItemPicker.List");

export function useFilteredItems(partName: string) {
    const { items, getName } = useItemPickerContext(partName);
    const { filter } = useItemPickerFilter(partName);
    return useMemo(() => {
        const needle = filter.trim().toLowerCase();
        if (!needle) return items;
        return items.filter((item) => getName(item).toLowerCase().includes(needle));
    }, [items, getName, filter]);
}
