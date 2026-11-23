import { Code, Stack, Title } from "@mantine/core";
import { useSelection } from "@vela-tools/ngsi";

export function SelectionPanel() {
    const selection = useSelection();
    return (
        <Stack gap="xs">
            <Title order={5}>Selection</Title>
            <Code block>{JSON.stringify(selection, null, 2)}</Code>
        </Stack>
    );
}
