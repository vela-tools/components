import { Text } from "@mantine/core";
import { useSubscriptionListContext } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Empty({ className, style }: PartProps) {
    const { subscriptions, emptyText = "No subscriptions" } = useSubscriptionListContext("Empty");
    if (subscriptions.length > 0) return null;
    return (
        <Text size="sm" c="dimmed" ta="center" className={className} style={style}>
            {emptyText}
        </Text>
    );
}
