import { useQuery } from "@tanstack/react-query";
import { useNgsiContext } from "../runtime/ngsiContext";
import { ngsiKeys } from "../runtime/queryKeys";

export function useEntityTypes() {
    const { adapters, broker } = useNgsiContext();
    return useQuery({
        queryKey: ngsiKeys.types(broker.id),
        queryFn: ({ signal }) => adapters.entities.listTypes({ signal }),
    });
}
