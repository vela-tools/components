import { Button } from "@mantine/core";
import { useSubscriptionListContext, useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function StatusToggle({ className, style }: PartProps) {
    const { toggleStatus, pendingIds } = useSubscriptionListContext("StatusToggle");
    const subscription = useSubscriptionListItem("StatusToggle");
    if (!toggleStatus || subscription.status === "expired") return null;
    const active = subscription.status === "active";
    return (
        <Button
            size="compact-xs"
            variant="light"
            color={active ? "yellow" : "teal"}
            disabled={pendingIds.includes(subscription.id)}
            className={className}
            style={style}
            onClick={(event) => {
                event.stopPropagation();
                toggleStatus(subscription, active ? "paused" : "active");
            }}
        >
            {active ? "Pause" : "Activate"}
        </Button>
    );
}
