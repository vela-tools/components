import { Badge } from "@mantine/core";
import { useNotificationListItem } from "../NotificationList.context";
import type { PartProps } from "./types";

export function Status({ className, style }: PartProps) {
    const notification = useNotificationListItem("Status");
    return (
        <Badge
            variant="light"
            size="sm"
            radius="sm"
            color={notification.status === "delivered" ? "teal" : "red"}
            className={className}
            style={style}
        >
            {notification.status}
        </Badge>
    );
}
