import { Text } from "@mantine/core";
import { useFilteredItems, useItemPickerContext } from "../ItemPicker.context";
import type { PartProps } from "./types";

export function Empty({ className, style }: PartProps) {
    const { loading, emptyText } = useItemPickerContext("Empty");
    const items = useFilteredItems("Empty");
    if (loading || !emptyText || items.length > 0) return null;
    return (
        <Text size="sm" c="dimmed" ta="center" p="md" className={className} style={style}>
            {emptyText}
        </Text>
    );
}
