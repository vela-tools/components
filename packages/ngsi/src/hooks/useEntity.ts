import { useQuery } from "@tanstack/react-query";
import { useNgsiContext } from "../runtime/ngsiContext";
import { ngsiKeys } from "../runtime/queryKeys";
import { useNgsiSelector } from "./useNgsiSelector";

export function useEntity(id?: string | null) {
    const { adapters, broker } = useNgsiContext();
    const selectedId = useNgsiSelector((s) => s.entityId);
    const entityId = id !== undefined ? id : selectedId;

    return useQuery({
        queryKey: ngsiKeys.entity(broker.id, entityId),
        queryFn: ({ signal }) => adapters.entities.getEntity(entityId as string, { signal }),
        enabled: entityId != null,
    });
}
