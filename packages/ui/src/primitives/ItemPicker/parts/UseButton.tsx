import { Button } from "@mantine/core";
import { useItemPickerContext, useItemPickerItem } from "../ItemPicker.context";
import type { PartProps } from "./types";

export function UseButton({ className, style }: PartProps) {
    const { getId, use } = useItemPickerContext("UseButton");
    const item = useItemPickerItem("UseButton");
    if (!use) return null;
    return (
        <Button
            onClick={() => use(getId(item))}
            p={0}
            mt={5}
            className={className}
            style={{ height: 30, width: 60, borderRadius: 20, ...style }}
        >
            Use
        </Button>
    );
}
