import { ColumnChooser, Error, FiltersToggle, Grid, Toolbar } from "./parts";

export const EntityTable = {
    Grid,
    Toolbar,
    FiltersToggle,
    ColumnChooser,
    Error,
};

export type EntityTableParts = typeof EntityTable;

export { EntityTableProvider, useEntityTableContext } from "./EntityTable.context";
export type { EntityTableContextValue } from "./EntityTable.context";
export type {
    EntityTableColumnChooserProps,
    EntityTableFiltersToggleProps,
    EntityTablePartProps,
    EntityTableToolbarProps,
} from "./parts";
