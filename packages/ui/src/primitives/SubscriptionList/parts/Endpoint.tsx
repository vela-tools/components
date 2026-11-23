import { Text } from "@mantine/core";
import { useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Endpoint({ className, style }: PartProps) {
    const { endpoint } = useSubscriptionListItem("Endpoint");
    if (!endpoint) return null;
    return (
        <Text
            size="xs"
            c="dimmed"
            ff="monospace"
            truncate="end"
            maw={260}
            title={endpoint.uri}
            className={className}
            style={style}
        >
            {endpoint.uri}
        </Text>
    );
}
