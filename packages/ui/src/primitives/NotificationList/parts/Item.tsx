import type { ReactNode } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { formatPayload, formatTime } from "../../../utils/subscriptions";
import { useNotificationListContext, useNotificationListItem } from "../NotificationList.context";
import { Status } from "./Status";
import { subscriptionLabel } from "./subscriptionLabel";
import type { PartProps } from "./types";

export type NotificationListItemProps = PartProps & { children?: ReactNode };

function DefaultContent() {
    const { subscriptionNames } = useNotificationListContext("Item");
    const notification = useNotificationListItem("Item");
    return (
        <Stack gap={2}>
            <Group justify="space-between" wrap="nowrap">
                <Text size="sm">{subscriptionLabel(notification, subscriptionNames)}</Text>
                <Status />
            </Group>
            <Text size="xs" c="dimmed">
                {formatTime(notification.receivedAt)}
            </Text>
            <Text size="xs" ff="monospace" lineClamp={2}>
                {formatPayload(notification.payload)}
            </Text>
        </Stack>
    );
}

export function Item({ className, style, children }: NotificationListItemProps) {
    useNotificationListItem("Item");
    return (
        <Paper withBorder p="xs" className={className} style={style}>
            {children ?? <DefaultContent />}
        </Paper>
    );
}
