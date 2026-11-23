import type { ReactNode } from "react";
import { ScrollArea, Stack } from "@mantine/core";
import { staleProps } from "../../staleStyle";
import { ItemPickerItemProvider, useFilteredItems, useItemPickerContext } from "../ItemPicker.context";
import { Item } from "./Item";
import type { PartProps } from "./types";

export type ItemPickerListProps = PartProps & {
    children?: (item: unknown) => ReactNode;
};

export function List({ className, style, children }: ItemPickerListProps) {
    const { getId, stale } = useItemPickerContext("List");
    const items = useFilteredItems("List");
    return (
        <ScrollArea className={className} style={{ flex: 1, minHeight: 0, ...style }}>
            <Stack gap="sm" p="md" {...staleProps(stale)}>
                {items.map((item) => (
                    <ItemPickerItemProvider key={getId(item)} value={item}>
                        {children ? children(item) : <Item />}
                    </ItemPickerItemProvider>
                ))}
            </Stack>
        </ScrollArea>
    );
}
