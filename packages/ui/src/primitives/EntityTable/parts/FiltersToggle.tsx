import type { ReactNode } from "react";
import { Button } from "@mantine/core";
import { useEntityTableContext } from "../EntityTable.context";
import type { PartProps } from "./types";

export type EntityTableFiltersToggleProps = PartProps & { label?: ReactNode };

export function FiltersToggle({ label = "Filters", className, style }: EntityTableFiltersToggleProps) {
    const { showFilters, setShowFilters } = useEntityTableContext("FiltersToggle");
    if (!setShowFilters) return null;
    return (
        <Button
            variant="default"
            size="compact-xs"
            w={100}
            aria-pressed={showFilters}
            onClick={() => setShowFilters(!showFilters)}
            className={className}
            style={style}
        >
            {label}
        </Button>
    );
}
