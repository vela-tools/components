import { Text } from "@mantine/core";
import { useItemPickerContext } from "../ItemPicker.context";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useItemPickerContext("Error");
    if (!error) return null;
    return (
        <Text role="alert" size="xs" c="red" px="md" className={className} style={style}>
            {error}
        </Text>
    );
}
