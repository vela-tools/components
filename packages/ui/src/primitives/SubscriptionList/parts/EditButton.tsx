import { Button } from "@mantine/core";
import { useSubscriptionListContext, useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function EditButton({ className, style }: PartProps) {
    const { edit, pendingIds } = useSubscriptionListContext("EditButton");
    const subscription = useSubscriptionListItem("EditButton");
    if (!edit) return null;
    return (
        <Button
            size="compact-xs"
            variant="subtle"
            disabled={pendingIds.includes(subscription.id)}
            className={className}
            style={style}
            onClick={(event) => {
                event.stopPropagation();
                edit(subscription);
            }}
        >
            Edit
        </Button>
    );
}
