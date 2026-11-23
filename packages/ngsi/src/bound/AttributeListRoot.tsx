import { useCallback, useMemo, type ReactNode } from "react";
import { ItemPickerProvider, type ItemPickerContextValue } from "@vela-tools/ui";
import { useEntity } from "../hooks/useEntity";
import { useNgsiCommands } from "../hooks/useNgsi";
import { useNgsiSelector } from "../hooks/useNgsiSelector";
import { entityAttributeNames } from "../runtime/predicates";
import type { NgsiLdEntity } from "../types";
import { errorMessage } from "./errorMessage";
import { useSelectionMode, type SelectionMode } from "./useSelectionMode";

export type AttributeListRootProps = {
    entityId?: string;
    selection?: SelectionMode;
    selectedId?: string | null;
    onSelect?: (attribute: string | null) => void;
    onUse?: (attribute: string, entity: NgsiLdEntity) => void;
    emptyText?: ReactNode;
    children: ReactNode;
};

const identity = (name: string) => name;

export function AttributeListRoot({
    entityId: pinnedId,
    selection = pinnedId !== undefined ? "local" : "shared",
    selectedId: controlledId,
    onSelect,
    onUse,
    emptyText,
    children,
}: AttributeListRootProps) {
    const sharedEntityId = useNgsiSelector((s) => s.entityId);
    const sharedAttribute = useNgsiSelector((s) => s.attribute);
    const entityId = pinnedId ?? sharedEntityId;
    const result = useEntity(entityId);
    const entity = result.data;
    const items = useMemo(() => entityAttributeNames(entity), [entity]);
    const { selectAttribute } = useNgsiCommands();

    const selectShared = useCallback(
        (name: string | null) => void selectAttribute(name, entityId ? { entityId } : undefined),
        [selectAttribute, entityId],
    );

    const { selectedId: candidate, select } = useSelectionMode({
        mode: selection,
        controlledId,
        onSelect,
        sharedId: sharedEntityId === entityId ? sharedAttribute : null,
        selectShared,
    });

    const selectedId = candidate !== null && items.includes(candidate) ? candidate : null;

    const use = useMemo(
        () =>
            onUse && entity
                ? (name: string) => {
                      select(name);
                      onUse(name, entity);
                  }
                : undefined,
        [onUse, entity, select],
    );

    const value = useMemo<ItemPickerContextValue<string>>(
        () => ({
            items,
            getId: identity,
            getName: identity,
            selectedId,
            select,
            use,
            loading: entityId !== null && result.isPending,
            stale: result.isFetching && (result.isPlaceholderData || result.isPending),
            error: result.error ? errorMessage(result.error) : null,
            emptyText:
                entityId === null ? undefined : entity === null ? "Entity not found" : (emptyText ?? "No attributes"),
        }),
        [
            items,
            selectedId,
            select,
            use,
            entityId,
            entity,
            result.isPending,
            result.isFetching,
            result.isPlaceholderData,
            result.error,
            emptyText,
        ],
    );

    return <ItemPickerProvider value={value}>{children}</ItemPickerProvider>;
}
