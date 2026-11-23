import type { ReactNode } from "react";
import { Text } from "@mantine/core";
import { useItemPickerContext } from "../ItemPicker.context";
import type { PartProps } from "./types";

export type ItemPickerHeaderProps = PartProps & { title: ReactNode };

export function Header({ title, className, style }: ItemPickerHeaderProps) {
    useItemPickerContext("Header");
    return (
        <Text ta="center" w="100%" fw={600} m={5} className={className} style={style}>
            {title}
        </Text>
    );
}
