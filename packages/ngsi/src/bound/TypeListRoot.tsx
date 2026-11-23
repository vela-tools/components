import { useCallback, useMemo, type ReactNode } from "react";
import { ItemPickerProvider, type ItemPickerContextValue } from "@vela-tools/ui";
import { useEntityTypes } from "../hooks/useEntityTypes";
import { useNgsiCommands } from "../hooks/useNgsi";
import { useNgsiSelector } from "../hooks/useNgsiSelector";
import { sameTypeRef } from "../runtime/predicates";
import type { EntityTypeInfo, EntityTypeRef } from "../types";
import { errorMessage } from "./errorMessage";
import { useSelectionMode, type SelectionMode } from "./useSelectionMode";

export type TypeListRootProps = {
    selection?: SelectionMode;
    selectedId?: string | null;
    onSelect?: (id: string | null, type: EntityTypeRef | null) => void;
    emptyText?: ReactNode;
    children: ReactNode;
};

const NO_TYPES: EntityTypeInfo[] = [];
const typeId = (info: EntityTypeInfo) => `${info.type.contextUri ?? ""}${info.type.type}`;
const typeName = (info: EntityTypeInfo) => info.type.type;

export function TypeListRoot({
    selection = "shared",
    selectedId: controlledId,
    onSelect,
    emptyText,
    children,
}: TypeListRootProps) {
    const result = useEntityTypes();
    const items = result.data ?? NO_TYPES;
    const sharedTypes = useNgsiSelector((s) => s.types);
    const { selectTypes } = useNgsiCommands();

    const find = useCallback(
        (id: string | null) => (id === null ? null : (items.find((info) => typeId(info) === id) ?? null)),
        [items],
    );

    const sharedId = useMemo(() => {
        const selected = items.find((info) => sharedTypes.some((t) => sameTypeRef(t, info.type)));
        return selected ? typeId(selected) : null;
    }, [items, sharedTypes]);

    const selectShared = useCallback(
        (id: string | null) => {
            const info = find(id);
            void selectTypes(info ? [info.type] : []);
        },
        [find, selectTypes],
    );

    const reportSelect = useCallback((id: string | null) => onSelect?.(id, find(id)?.type ?? null), [onSelect, find]);

    const { selectedId, select } = useSelectionMode({
        mode: selection,
        controlledId,
        onSelect: onSelect ? reportSelect : undefined,
        sharedId,
        selectShared,
    });

    const value = useMemo<ItemPickerContextValue<EntityTypeInfo>>(
        () => ({
            items,
            getId: typeId,
            getName: typeName,
            selectedId,
            select,
            loading: result.isPending,
            stale: result.isFetching && (result.isPlaceholderData || result.isPending),
            error: result.error ? errorMessage(result.error) : null,
            emptyText: emptyText ?? "No entity types",
        }),
        [
            items,
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
