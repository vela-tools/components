import { skipToken, useQuery } from "@tanstack/react-query";
import { useNgsiContext } from "../runtime/ngsiContext";
import { ngsiKeys } from "../runtime/queryKeys";

export function useSavedQueries() {
    const { adapters, broker } = useNgsiContext();
    const store = adapters.savedQueries;
    return useQuery({
        queryKey: ngsiKeys.savedQueries(broker.id),
        queryFn: store ? ({ signal }) => store.list({ signal }) : skipToken,
    });
}
