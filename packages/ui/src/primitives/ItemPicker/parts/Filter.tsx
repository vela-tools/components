import { TextInput } from "@mantine/core";
import { useItemPickerFilter } from "../ItemPicker.context";
import type { PartProps } from "./types";

export type ItemPickerFilterProps = PartProps & { placeholder?: string };

export function Filter({ placeholder = "Search...", className, style }: ItemPickerFilterProps) {
    const { filter, setFilter } = useItemPickerFilter("Filter");
    return (
        <TextInput
            placeholder={placeholder}
            aria-label={placeholder}
            value={filter}
            onChange={(event) => setFilter(event.currentTarget.value)}
            px="md"
            className={className}
            style={style}
        />
    );
}
