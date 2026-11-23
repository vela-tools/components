import { Text } from "@mantine/core";
import { useNotificationListContext } from "../NotificationList.context";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useNotificationListContext("Error");
    if (!error) return null;
    return (
        <Text role="alert" size="xs" c="red" className={className} style={style}>
            {error}
        </Text>
    );
}
