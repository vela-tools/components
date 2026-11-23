import { Text } from "@mantine/core";
import { useNotificationListContext } from "../NotificationList.context";
import type { PartProps } from "./types";

export function Empty({ className, style }: PartProps) {
    const { notifications, emptyText = "No notifications" } = useNotificationListContext("Empty");
    if (notifications.length > 0) return null;
    return (
        <Text size="sm" c="dimmed" ta="center" className={className} style={style}>
            {emptyText}
        </Text>
    );
}
