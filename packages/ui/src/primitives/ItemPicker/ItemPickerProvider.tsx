import { useMemo, useState, type ReactNode } from "react";
import { ItemPickerContextProvider, ItemPickerFilterProvider, type ItemPickerContextValue } from "./ItemPicker.context";

export type ItemPickerProviderProps<T> = {
    value: ItemPickerContextValue<T>;
    children?: ReactNode;
};

export function ItemPickerProvider<T>({ value, children }: ItemPickerProviderProps<T>) {
    const [filter, setFilter] = useState("");
    const filterValue = useMemo(() => ({ filter, setFilter }), [filter]);
    return (
        <ItemPickerContextProvider value={value as ItemPickerContextValue}>
            <ItemPickerFilterProvider value={filterValue}>{children}</ItemPickerFilterProvider>
        </ItemPickerContextProvider>
    );
}
