import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { useNgsiContext } from "../runtime/ngsiContext";
import { ngsiKeys, type NotificationQuery } from "../runtime/queryKeys";

export function useNotifications(query: NotificationQuery = {}) {
    const { adapters, broker } = useNgsiContext();
    const source = adapters.notifications;
    const { subscriptionId, limit } = query;
    return useQuery({
        queryKey: ngsiKeys.notifications(broker.id, { subscriptionId, limit }),
        queryFn: source ? ({ signal }) => source.list({ subscriptionId, limit }, { signal }) : skipToken,
        placeholderData: keepPreviousData,
    });
}
