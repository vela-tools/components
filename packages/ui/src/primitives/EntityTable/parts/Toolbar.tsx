import type { ReactNode } from "react";
import { Group } from "@mantine/core";
import { useEntityTableContext } from "../EntityTable.context";
import { ColumnChooser } from "./ColumnChooser";
import { FiltersToggle } from "./FiltersToggle";
import type { PartProps } from "./types";

export type EntityTableToolbarProps = PartProps & { children?: ReactNode };

export function Toolbar({ className, style, children }: EntityTableToolbarProps) {
    useEntityTableContext("Toolbar");
    return (
        <Group p={4} gap="xs" className={className} style={style}>
            {children ?? (
                <>
                    <FiltersToggle />
                    <ColumnChooser />
                </>
            )}
        </Group>
    );
}
