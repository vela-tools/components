import { skipToken, useQuery } from "@tanstack/react-query";
import { useNgsiContext } from "../runtime/ngsiContext";
import { ngsiKeys } from "../runtime/queryKeys";

export function useSubscriptions() {
    const { adapters, broker } = useNgsiContext();
    const store = adapters.subscriptions;
    return useQuery({
        queryKey: ngsiKeys.subscriptions(broker.id),
        queryFn: store ? ({ signal }) => store.list({ signal }) : skipToken,
    });
}
