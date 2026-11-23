import { useCallback, useState } from "react";

export type SelectionMode = "shared" | "local";

type SelectionModeOptions = {
    mode: SelectionMode;
    controlledId: string | null | undefined;
    onSelect: ((id: string | null) => void) | undefined;
    sharedId: string | null;
    selectShared: (id: string | null) => void;
};

export function useSelectionMode({ mode, controlledId, onSelect, sharedId, selectShared }: SelectionModeOptions) {
    const [localId, setLocalId] = useState<string | null>(null);

    const selectedId = controlledId !== undefined ? controlledId : mode === "local" ? localId : sharedId;

    const select = useCallback(
        (id: string | null) => {
            if (controlledId === undefined) {
                if (mode === "local") setLocalId(id);
                else selectShared(id);
            }
            onSelect?.(id);
        },
        [controlledId, mode, selectShared, onSelect],
    );

    return { selectedId, select };
}
