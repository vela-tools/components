import type { CSSProperties } from "react";
import { Box } from "@mantine/core";
import { QueryBuilder as QueryBuilderParts, type QueryBuilderGeo, type QueryBuilderOperator } from "@vela-tools/ui";
import { QueryBuilderRoot } from "../bound/QueryBuilderRoot";
import type { EntityQuery } from "../types";

export type QueryBuilderProps = {
    onQueryRun?: (query: EntityQuery) => void;
    presetLocations?: QueryBuilderGeo[];
    onAddPresetLocation?: (location: QueryBuilderGeo) => void;
    operators?: QueryBuilderOperator[];
    className?: string;
    style?: CSSProperties;
};

const panelStyle: CSSProperties = {
    width: 264,
    flexShrink: 0,
    borderRight: "1px solid var(--vela-color-border)",
    background: "var(--vela-color-bg)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
};

export function QueryBuilder({
    onQueryRun,
    presetLocations,
    onAddPresetLocation,
    operators,
    className,
    style,
}: QueryBuilderProps) {
    return (
        <QueryBuilderRoot
            onQueryRun={onQueryRun}
            presetLocations={presetLocations}
            onAddPresetLocation={onAddPresetLocation}
            operators={operators}
        >
            <Box className={className} style={{ ...panelStyle, ...style }}>
                <QueryBuilderParts.EntityTypes />
                <QueryBuilderParts.Conditions>
                    <QueryBuilderParts.Preview />
                    <QueryBuilderParts.Actions />
                    <QueryBuilderParts.Error />
                </QueryBuilderParts.Conditions>
                <QueryBuilderParts.GeoRegion />
                <QueryBuilderParts.SavedQueries />
            </Box>
        </QueryBuilderRoot>
    );
}
