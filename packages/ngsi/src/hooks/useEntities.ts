import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNgsiContext } from "../runtime/ngsiContext";
import { ngsiKeys } from "../runtime/queryKeys";
import type { EntityQuery } from "../types";
import { useNgsiSelector } from "./useNgsiSelector";

export function useEntities(query?: EntityQuery) {
    const { adapters, broker } = useNgsiContext();
    const active = useNgsiSelector((s) => s.query);
    const resolved = query ?? active;

    return useQuery({
        queryKey: ngsiKeys.entities(broker.id, resolved),
        queryFn: ({ signal }) => adapters.entities.queryEntities(resolved, { signal }),
        placeholderData: keepPreviousData,
    });
}
