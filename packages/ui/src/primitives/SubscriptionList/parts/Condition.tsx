import { Stack, Text } from "@mantine/core";
import { geoLabel } from "../../QueryBuilder/queryBuilder.utils";
import { useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Condition({ className, style }: PartProps) {
    const { q, geo } = useSubscriptionListItem("Condition");
    return (
        <Stack gap={0} className={className} style={style}>
            {q && (
                <Text size="xs" ff="monospace">
                    {q}
                </Text>
            )}
            {geo && (
                <Text size="xs" c="dimmed">
                    Near {geoLabel(geo)}
                </Text>
            )}
            {!q && !geo && (
                <Text size="xs" c="dimmed">
                    Any change
                </Text>
            )}
        </Stack>
    );
}
