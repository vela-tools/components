import { Text } from "@mantine/core";
import { useSubscriptionListContext } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useSubscriptionListContext("Error");
    if (!error) return null;
    return (
        <Text role="alert" size="xs" c="red" className={className} style={style}>
            {error}
        </Text>
    );
}
