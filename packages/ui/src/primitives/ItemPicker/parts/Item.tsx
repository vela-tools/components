import type { ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import { useItemPickerContext, useItemPickerItem } from "../ItemPicker.context";
import type { PartProps } from "./types";
import { UseButton } from "./UseButton";

export type ItemPickerItemProps = PartProps & { children?: ReactNode };

export function Item({ className, style, children }: ItemPickerItemProps) {
    const { getId, getName, selectedId, select } = useItemPickerContext("Item");
    const item = useItemPickerItem("Item");
    const id = getId(item);
    const selected = id === selectedId;
    return (
        <div className={className} style={{ display: "flex", width: "100%", ...style }}>
            <UnstyledButton
                onClick={() => select(id)}
                p="sm"
                aria-pressed={selected}
                style={{
                    flex: 1,
                    borderRadius: 6,
                    backgroundColor: selected ? "var(--mantine-color-blue-light)" : "transparent",
                }}
            >
                {children ?? getName(item)}
            </UnstyledButton>
            <UseButton />
        </div>
    );
}
