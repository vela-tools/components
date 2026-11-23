import type { ReactNode } from "react";
import type { NotificationRecord } from "../../utils/subscriptions.types";
import { createItemContext } from "../createItemContext";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type NotificationListContextValue = {
    notifications: NotificationRecord[];
    subscriptionNames?: Record<string, string>;
    stale: boolean;
    error?: ReactNode;
    emptyText?: ReactNode;
};

export const [NotificationListProvider, useNotificationListContext] =
    createPrimitiveContext<NotificationListContextValue>("NotificationList");

export const [NotificationListItemProvider, useNotificationListItem] = createItemContext<NotificationRecord>(
    "NotificationList",
    "NotificationList.Table or NotificationList.Items",
);
