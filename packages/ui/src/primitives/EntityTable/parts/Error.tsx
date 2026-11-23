import { Text } from "@mantine/core";
import { useEntityTableContext } from "../EntityTable.context";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useEntityTableContext("Error");
    if (!error) return null;
    return (
        <Text role="alert" size="xs" c="red" className={className} style={style}>
            {error}
        </Text>
    );
}
