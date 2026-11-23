import { Text } from "@mantine/core";
import { useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Unreadable({ className, style }: PartProps) {
    const subscription = useSubscriptionListItem("Unreadable");
    if (!subscription.unreadable?.length) return null;
    return (
        <Text
            size="xs"
            c="orange"
            className={className}
            style={style}
            title="The broker returned values that can't be read. They are left out and can't be edited."
        >
            Can't read: {subscription.unreadable.join(", ")}
        </Text>
    );
}
