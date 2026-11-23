import { Badge, Group } from "@mantine/core";
import { useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Types({ className, style }: PartProps) {
    const subscription = useSubscriptionListItem("Types");
    return (
        <Group gap={4} className={className} style={style}>
            {subscription.types.map((type) => (
                <Badge key={type} variant="light" size="sm" radius="sm" tt="none">
                    {type}
                </Badge>
            ))}
            {subscription.idSelectors && (
                <Badge
                    variant="outline"
                    color="gray"
                    size="sm"
                    radius="sm"
                    tt="none"
                    title="Also selects entities by id or id pattern; not editable here."
                >
                    + id selectors
                </Badge>
            )}
        </Group>
    );
}
