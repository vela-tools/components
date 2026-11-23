import { Text } from "@mantine/core";
import { useEntityDetailsContext } from "../EntityDetails.context";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useEntityDetailsContext("Error");
    if (!error) return null;
    return (
        <Text role="alert" size="xs" c="red" className={className} style={style}>
            {error}
        </Text>
    );
}
