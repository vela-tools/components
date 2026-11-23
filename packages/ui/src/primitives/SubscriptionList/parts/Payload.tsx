import { Badge, Group, Stack, Text } from "@mantine/core";
import { formatLabel } from "../../../utils/subscriptions";
import { useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Payload({ className, style }: PartProps) {
    const { payload } = useSubscriptionListItem("Payload");
    if (!payload) return null;
    const extras = [
        payload.showChanges ? "previous values" : null,
        payload.sysAttrs ? "system attributes" : null,
        payload.join ? `linked entities (${payload.join})` : null,
    ].filter((extra): extra is string => !!extra);
    return (
        <Stack gap={2} className={className} style={style}>
            <Group gap={4} wrap="nowrap">
                <Badge variant="outline" size="sm" radius="sm" tt="none">
                    {formatLabel(payload.format)}
                </Badge>
                {extras.length > 0 && (
                    <Text size="xs" c="dimmed">
                        + {extras.join(", ")}
                    </Text>
                )}
            </Group>
            {payload.pick?.length ? <Text size="xs">Only {payload.pick.join(", ")}</Text> : null}
            {payload.omit?.length ? <Text size="xs">Without {payload.omit.join(", ")}</Text> : null}
        </Stack>
    );
}
