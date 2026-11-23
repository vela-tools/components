import { ColumnChooser as ColumnChooserLeaf } from "../../../leaves/ColumnChooser/ColumnChooser";
import { useEntityTableContext } from "../EntityTable.context";
import type { PartProps } from "./types";

export type EntityTableColumnChooserProps = PartProps & {
    label?: string;
    width?: number | string;
};

export function ColumnChooser({ label, width = 150, className, style }: EntityTableColumnChooserProps) {
    const { entities, defaultColumns, columns, setColumns } = useEntityTableContext("ColumnChooser");
    if (!setColumns) return null;
    return (
        <ColumnChooserLeaf
            entities={entities}
            defaultColumns={defaultColumns}
            value={columns}
            onChange={setColumns}
            label={label}
            width={width}
            className={className}
            style={style}
        />
    );
}
