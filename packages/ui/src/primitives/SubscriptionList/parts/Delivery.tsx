import { Badge, Group, Stack, Text } from "@mantine/core";
import { formatTime } from "../../../utils/subscriptions";
import { useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Delivery({ className, style }: PartProps) {
    const { delivery } = useSubscriptionListItem("Delivery");
    const failing = delivery?.status === "failed";
    const sent = delivery?.timesSent ?? 0;
    const failed = delivery?.timesFailed ?? 0;
    return (
        <Stack gap={2} className={className} style={style}>
            <Group gap={4} wrap="nowrap">
                {failing && (
                    <Badge color="red" variant="light" size="sm" radius="sm" tt="none">
                        Failing
                    </Badge>
                )}
                <Text size="xs" c={delivery?.lastNotification ? undefined : "dimmed"}>
                    {delivery?.lastNotification ? formatTime(delivery.lastNotification) : "Never notified"}
                </Text>
            </Group>
            <Text size="xs" c="dimmed">
                {failed ? `${sent} sent, ${failed} failed` : `${sent} sent`}
            </Text>
            {failing && delivery?.lastFailure && (
                <Text size="xs" c="red">
                    Last failure {formatTime(delivery.lastFailure)}
                </Text>
            )}
        </Stack>
    );
}
