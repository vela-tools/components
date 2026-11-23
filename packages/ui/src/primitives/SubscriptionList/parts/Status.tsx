import { Badge } from "@mantine/core";
import { useSubscriptionListItem } from "../SubscriptionList.context";
import type { SubscriptionStatus } from "../../../utils/subscriptions.types";
import type { PartProps } from "./types";

const COLORS: Record<SubscriptionStatus, string> = { active: "teal", paused: "yellow", expired: "gray" };

export function Status({ className, style }: PartProps) {
    const subscription = useSubscriptionListItem("Status");
    return (
        <Badge
            circle
            size="xs"
            color={COLORS[subscription.status]}
            aria-label={subscription.status}
            className={className}
            style={style}
        />
    );
}
