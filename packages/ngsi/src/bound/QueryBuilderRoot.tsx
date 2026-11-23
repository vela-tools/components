import { useMemo, type ReactNode } from "react";
import {
    DEFAULT_QUERY_OPERATORS,
    QueryBuilderProvider,
    type QueryBuilderContextValue,
    type QueryBuilderGeo,
    type QueryBuilderOperator,
} from "@vela-tools/ui";
import type { EntityQuery } from "../types";
import { useQueryBuilder } from "./queryBuilder/useQueryBuilder";

export type QueryBuilderRootProps = {
    defaultQuery?: EntityQuery;
    onQueryRun?: (query: EntityQuery) => void;
    presetLocations?: QueryBuilderGeo[];
    onAddPresetLocation?: (location: QueryBuilderGeo) => void;
    operators?: QueryBuilderOperator[];
    children: ReactNode;
};

const NO_PRESETS: QueryBuilderGeo[] = [];
const noop = () => {};

export function QueryBuilderRoot({
    defaultQuery,
    onQueryRun,
    presetLocations = NO_PRESETS,
    onAddPresetLocation,
    operators = DEFAULT_QUERY_OPERATORS,
    children,
}: QueryBuilderRootProps) {
    const state = useQueryBuilder({ onQueryRun, defaultQuery });

    const value = useMemo<QueryBuilderContextValue>(
        () => ({
            draft: state.value,
            setDraft: state.onChange,
            types: state.types,
            typesLoading: state.typesLoading ?? false,
            preview: state.preview,
            error: state.error,
            busy: state.busy ?? false,
            run: state.onRun,
            reset: state.onNew,
            operators,
            presets: presetLocations,
            addPreset: onAddPresetLocation,
            saved: state.savedQueries && {
                items: state.savedQueries,
                loadedId: state.loadedId ?? null,
                load: state.onLoad ?? noop,
                runSaved: state.onRunSaved,
                save: state.onSave,
                update: state.onUpdate,
                remove: state.onDelete,
            },
        }),
        [state, operators, presetLocations, onAddPresetLocation],
    );

    return <QueryBuilderProvider value={value}>{children}</QueryBuilderProvider>;
}
