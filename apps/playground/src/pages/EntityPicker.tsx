import { useState } from "react";
import { Code, Paper, Stack, Title } from "@mantine/core";
import { EntityPicker } from "@vela-tools/ngsi";
import { Page } from "../Page";

export function EntityPickerPage() {
    const [picked, setPicked] = useState<{ entityId: string; attribute: string } | null>(null);
    return (
        <Page title="EntityPicker" description="Type → entity → attribute. Use calls onPick.">
            <Paper withBorder p="md">
                <Stack gap="xs">
                    <Title order={5}>EntityPicker (built from the list Roots)</Title>
                    <EntityPicker onPick={(entity, attribute) => setPicked({ entityId: entity.id, attribute })} />
                </Stack>
            </Paper>
            <Code block>{picked ? JSON.stringify(picked, null, 2) : "onPick not called yet"}</Code>
        </Page>
    );
}
