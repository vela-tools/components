import { useCallback, useMemo, useState, type ReactNode } from "react";
import { EntityTableProvider, generateTypeColors, type EntityTableContextValue } from "@vela-tools/ui";
import { useEntities } from "../hooks/useEntities";
import { useNgsiCommands } from "../hooks/useNgsi";
import { useNgsiSelector } from "../hooks/useNgsiSelector";
import type { EntityQuery, EntityTypeRef, NgsiLdEntity } from "../types";
import { errorMessage } from "./errorMessage";
import { useSelectionMode, type SelectionMode } from "./useSelectionMode";

export type EntityTableRootProps = {
    types?: EntityTypeRef[];
    query?: EntityQuery;
    selection?: SelectionMode;
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    defaultColumns?: string[];
    typeColors?: Record<string, string>;
    autoGenerateTypeColors?: boolean;
    pageSize?: number;
    children: ReactNode;
};

const DEFAULT_COLUMNS = ["id", "type"];
const NO_ENTITIES: NgsiLdEntity[] = [];

export function EntityTableRoot({
    types,
    query,
    selection = "shared",
    selectedId: controlledId,
    onSelect,
    defaultColumns = DEFAULT_COLUMNS,
    typeColors,
    autoGenerateTypeColors = false,
    pageSize = 10,
    children,
}: EntityTableRootProps) {
    const active = useNgsiSelector((s) => s.query);
    const resolved = useMemo(() => {
        const base = query ?? active;
        return types ? { ...base, types } : base;
    }, [query, active, types]);
    const result = useEntities(resolved);
    const entities = result.data?.entities ?? NO_ENTITIES;
    const sharedId = useNgsiSelector((s) => s.entityId);
    const { selectEntity } = useNgsiCommands();

    const [columns, setColumns] = useState(defaultColumns);
    const [showFilters, setShowFilters] = useState(false);

    const selectShared = useCallback((id: string | null) => void selectEntity(id), [selectEntity]);
    const { selectedId, select } = useSelectionMode({
        mode: selection,
        controlledId,
        onSelect,
        sharedId,
        selectShared,
    });

    const colors = useMemo(
        () => (autoGenerateTypeColors ? generateTypeColors([...new Set(entities.map((e) => e.type))]) : typeColors),
        [autoGenerateTypeColors, entities, typeColors],
    );

    const value = useMemo<EntityTableContextValue>(
        () => ({
            entities,
            defaultColumns,
            columns,
            setColumns,
            selectedId,
            select,
            showFilters,
            setShowFilters,
            typeColors: colors,
            pageSize,
            stale: result.isFetching && (result.isPlaceholderData || result.isPending),
            error: result.error ? errorMessage(result.error) : null,
        }),
        [
            entities,
            defaultColumns,
            columns,
            selectedId,
            select,
            showFilters,
            colors,
            pageSize,
            result.isFetching,
            result.isPlaceholderData,
            result.isPending,
            result.error,
        ],
    );

    return <EntityTableProvider value={value}>{children}</EntityTableProvider>;
}
