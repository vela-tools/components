import { Text } from "@mantine/core";
import { errorMessage } from "../bound/errorMessage";

export function QueryError({ error }: { error: Error | null }) {
    if (!error) return null;
    return (
        <Text role="alert" size="xs" c="red" px="sm" py={4}>
            {errorMessage(error)}
        </Text>
    );
}
