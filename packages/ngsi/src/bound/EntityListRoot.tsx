import { useCallback, useMemo, type ReactNode } from "react";
import { ItemPickerProvider, type ItemPickerContextValue } from "@vela-tools/ui";
import { useEntities } from "../hooks/useEntities";
import { useNgsiCommands } from "../hooks/useNgsi";
import { useNgsiSelector } from "../hooks/useNgsiSelector";
import type { EntityTypeRef, NgsiLdEntity } from "../types";
import { errorMessage } from "./errorMessage";
import { useSelectionMode, type SelectionMode } from "./useSelectionMode";

export type EntityListRootProps = {
    types?: EntityTypeRef[];
    selection?: SelectionMode;
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    emptyText?: ReactNode;
    children: ReactNode;
};

const NO_ENTITIES: NgsiLdEntity[] = [];
const getId = (entity: NgsiLdEntity) => entity.id;

export function EntityListRoot({
    types,
    selection = "shared",
    selectedId: controlledId,
    onSelect,
    emptyText,
    children,
}: EntityListRootProps) {
    const active = useNgsiSelector((s) => s.query);
    const query = useMemo(() => (types ? { ...active, types } : active), [active, types]);
    const result = useEntities(query);
    const sharedId = useNgsiSelector((s) => s.entityId);
    const { selectEntity } = useNgsiCommands();

    const selectShared = useCallback((id: string | null) => void selectEntity(id), [selectEntity]);
    const { selectedId, select } = useSelectionMode({
        mode: selection,
        controlledId,
        onSelect,
        sharedId,
        selectShared,
    });

    const value = useMemo<ItemPickerContextValue<NgsiLdEntity>>(
        () => ({
            items: result.data?.entities ?? NO_ENTITIES,
            getId,
            getName: getId,
            selectedId,
            select,
            loading: result.isPending,
            stale: result.isFetching && (result.isPlaceholderData || result.isPending),
            error: result.error ? errorMessage(result.error) : null,
            emptyText: emptyText ?? "No entities",
        }),
        [
            result.data,
            result.isPending,
            result.isFetching,
            result.isPlaceholderData,
            result.error,
            selectedId,
            select,
            emptyText,
        ],
    );

    return <ItemPickerProvider value={value}>{children}</ItemPickerProvider>;
}
