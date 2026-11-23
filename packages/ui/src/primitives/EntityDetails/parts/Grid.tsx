import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { TabulatorFull as Tabulator, type ColumnDefinition } from "tabulator-tables";
import { entityAttributeRows, typeBadgeFormatter } from "../../../utils/entity";
import "../../../theme/tabulator.css";
import { useEntityDetailsContext } from "../EntityDetails.context";
import classes from "./EntityDetails.module.css";
import type { PartProps } from "./types";

export type EntityDetailsGridProps = PartProps & {
    height?: number | string;
    colorAttributeTypes?: boolean;
};

const ATTRIBUTE_TYPE_COLORS = {
    Property: "#2563eb",
    GeoProperty: "#16a34a",
    Relationship: "#dc2626",
};

export function Grid({ height, colorAttributeTypes = false, className, style }: EntityDetailsGridProps) {
    const { entity, stale } = useEntityDetailsContext("Grid");
    const containerRef = useRef<HTMLDivElement>(null);
    const rows = useMemo(() => entityAttributeRows(entity), [entity]);
    const columns = useMemo<ColumnDefinition[]>(
        () => [
            { title: "attribute", field: "key" },
            {
                title: "type",
                field: "type",
                ...(colorAttributeTypes && { formatter: typeBadgeFormatter(ATTRIBUTE_TYPE_COLORS) }),
            },
            { title: "value", field: "value" },
            { title: "observedAt", field: "observedAt" },
        ],
        [colorAttributeTypes],
    );

    useEffect(() => {
        if (!containerRef.current) return;
        const table = new Tabulator(containerRef.current, {
            data: rows,
            columns,
            layout: "fitColumns",
            selectableRows: false,
            height,
        });
        return () => table.destroy();
    }, [rows, columns, height]);

    return (
        <div className={clsx(classes.table, className)} style={style} data-stale={stale || undefined}>
            <div ref={containerRef} />
        </div>
    );
}
