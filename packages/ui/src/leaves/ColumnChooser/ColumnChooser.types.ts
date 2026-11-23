import type { CSSProperties } from "react";
import type { EntityRecord } from "../../utils/entity";

export type ColumnChooserProps = {
    entities: EntityRecord[];
    defaultColumns: string[];
    value: string[];
    onChange: (columns: string[]) => void;
    label?: string;
    width?: number | string;
    className?: string;
    style?: CSSProperties;
};
