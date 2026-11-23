import { useMemo, type ReactNode } from "react";
import { EntityDetailsProvider, type EntityDetailsContextValue } from "@vela-tools/ui";
import { useEntity } from "../hooks/useEntity";
import { useNgsiSelector } from "../hooks/useNgsiSelector";
import { errorMessage } from "./errorMessage";

export type EntityDetailsRootProps = {
    entityId?: string;
    children: ReactNode;
};

export function EntityDetailsRoot({ entityId: pinnedId, children }: EntityDetailsRootProps) {
    const sharedEntityId = useNgsiSelector((s) => s.entityId);
    const result = useEntity(pinnedId ?? sharedEntityId);

    const value = useMemo<EntityDetailsContextValue>(
        () => ({
            entity: result.data ?? null,
            stale: result.isFetching && (result.isPlaceholderData || result.isPending),
            error: result.error ? errorMessage(result.error) : null,
        }),
        [result.data, result.isFetching, result.isPlaceholderData, result.isPending, result.error],
    );

    return <EntityDetailsProvider value={value}>{children}</EntityDetailsProvider>;
}
