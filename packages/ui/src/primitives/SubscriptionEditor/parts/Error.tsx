import { Text } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useSubscriptionEditorContext("Error");
    if (!error) return null;
    return (
        <Text size="sm" c="red" role="alert" className={className} style={style}>
            {error}
        </Text>
    );
}
