import { Text } from "@mantine/core";
import { useBrokerConfigContext } from "../BrokerConfig.context";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useBrokerConfigContext("Error");
    if (!error) return null;
    return (
        <Text role="alert" size="xs" c="red" className={className} style={style}>
            {error}
        </Text>
    );
}
