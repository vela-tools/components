import type { ReactNode } from "react";
import { Stack } from "@mantine/core";
import type { NotificationRecord } from "../../../utils/subscriptions.types";
import { staleProps } from "../../staleStyle";
import { NotificationListItemProvider, useNotificationListContext } from "../NotificationList.context";
import { Item } from "./Item";
import type { PartProps } from "./types";

export type NotificationListItemsProps = PartProps & {
    children?: (notification: NotificationRecord) => ReactNode;
};

export function Items({ className, style, children }: NotificationListItemsProps) {
    const { notifications, stale } = useNotificationListContext("Items");
    return (
        <Stack gap="xs" className={className} {...staleProps(stale, style)}>
            {notifications.map((notification) => (
                <NotificationListItemProvider key={notification.id} value={notification}>
                    {children ? children(notification) : <Item />}
                </NotificationListItemProvider>
            ))}
        </Stack>
    );
}
