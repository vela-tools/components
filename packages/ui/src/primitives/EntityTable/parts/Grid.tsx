import { useMemo, useRef } from "react";
import { entityColumnDefs } from "../columns";
import { useEntityTable } from "../useEntityTable";
import { entityRows } from "../../../utils/entity";
import "../../../theme/tabulator.css";
import { useEntityTableContext } from "../EntityTable.context";
import type { PartProps } from "./types";

export function Grid({ className, style }: PartProps) {
    const { entities, columns, selectedId, select, showFilters, typeColors, pageSize, stale } =
        useEntityTableContext("Grid");
    const containerRef = useRef<HTMLDivElement>(null);
    const rows = useMemo(() => entityRows(entities), [entities]);
    const columnDefs = useMemo(
        () => entityColumnDefs(columns, { showFilters, typeColors }),
        [columns, showFilters, typeColors],
    );

    useEntityTable(containerRef, {
        rows,
        columnDefs,
        selectedId,
        pageSize,
        onRowClick: (row) => select(row.id),
    });

    return (
        <div className={className} style={style} data-stale={stale || undefined} aria-busy={stale || undefined}>
            <div ref={containerRef} />
        </div>
    );
}
