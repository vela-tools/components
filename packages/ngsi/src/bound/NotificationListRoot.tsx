import { useMemo, type ReactNode } from "react";
import { NotificationListProvider, subscriptionTitle, type NotificationListContextValue } from "@vela-tools/ui";
import { useNotifications } from "../hooks/useNotifications";
import { useSubscriptions } from "../hooks/useSubscriptions";
import type { Notification } from "../types";
import { errorMessage } from "./errorMessage";

export type NotificationListRootProps = {
    subscriptionId?: string;
    limit?: number;
    emptyText?: ReactNode;
    children: ReactNode;
};

const NO_NOTIFICATIONS: Notification[] = [];

export function NotificationListRoot({ subscriptionId, limit, emptyText, children }: NotificationListRootProps) {
    const query = useNotifications({ subscriptionId, limit });
    const subscriptions = useSubscriptions().data;

    const subscriptionNames = useMemo(
        () => Object.fromEntries((subscriptions ?? []).map((s) => [s.id, subscriptionTitle(s)])),
        [subscriptions],
    );

    const value = useMemo<NotificationListContextValue>(
        () => ({
            notifications: query.data ?? NO_NOTIFICATIONS,
            subscriptionNames,
            stale: query.isFetching && (query.isPlaceholderData || query.isPending),
            error: query.error ? errorMessage(query.error) : null,
            emptyText: query.isPending ? "Loading…" : (emptyText ?? "No notifications"),
        }),
        [
            query.data,
            query.isFetching,
            query.isPlaceholderData,
            query.isPending,
            query.error,
            subscriptionNames,
            emptyText,
        ],
    );

    return <NotificationListProvider value={value}>{children}</NotificationListProvider>;
}
