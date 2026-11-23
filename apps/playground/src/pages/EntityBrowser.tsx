import { useState } from "react";
import { Code, Paper, SimpleGrid, Stack, Title } from "@mantine/core";
import { EntityBrowser, EntityJson, Ngsi } from "@vela-tools/ngsi";
import { Page } from "../Page";

export function EntityBrowserPage() {
    const [controlledId, setControlledId] = useState<string | null>(null);

    return (
        <Page
            title="EntityBrowser"
            description="Entities of the active query, with details and JSON of the selected entity."
        >
            <EntityBrowser autoGenerateTypeColors />

            <Title order={4}>EntityTable.Root: custom layouts</Title>
            <SimpleGrid cols={2}>
                <Paper withBorder p="md">
                    <Stack gap="xs">
                        <Title order={5}>Shared selection, toolbar under the grid, auto type colours</Title>
                        <Ngsi.EntityTable.Root autoGenerateTypeColors pageSize={5}>
                            <Ngsi.EntityTable.Error />
                            <Ngsi.EntityTable.Grid />
                            <Ngsi.EntityTable.Toolbar />
                        </Ngsi.EntityTable.Root>
                    </Stack>
                </Paper>
                <Paper withBorder p="md">
                    <Stack gap="xs">
                        <Title order={5}>Cameras only, local selection, columns only</Title>
                        <Ngsi.EntityTable.Root
                            types={[{ type: "Camera" }]}
                            selection="local"
                            defaultColumns={["id", "status"]}
                            pageSize={5}
                        >
                            <Ngsi.EntityTable.Toolbar>
                                <Ngsi.EntityTable.ColumnChooser label="Fields" />
                            </Ngsi.EntityTable.Toolbar>
                            <Ngsi.EntityTable.Error />
                            <Ngsi.EntityTable.Grid />
                        </Ngsi.EntityTable.Root>
                    </Stack>
                </Paper>
                <Paper withBorder p="md">
                    <Stack gap="xs">
                        <Title order={5}>Controlled selection, no toolbar</Title>
                        <Ngsi.EntityTable.Root selectedId={controlledId} onSelect={setControlledId} pageSize={5}>
                            <Ngsi.EntityTable.Grid />
                        </Ngsi.EntityTable.Root>
                        <Code block>{`selectedId: ${controlledId ?? "null"}`}</Code>
                    </Stack>
                </Paper>
            </SimpleGrid>

            <Title order={4}>EntityDetails.Root and EntityJson: details next to the table</Title>
            <SimpleGrid cols={2}>
                <Paper withBorder p="md">
                    <Ngsi.EntityTable.Root pageSize={8}>
                        <Ngsi.EntityTable.Error />
                        <Ngsi.EntityTable.Grid />
                    </Ngsi.EntityTable.Root>
                </Paper>
                <Paper withBorder p="md">
                    <Ngsi.EntityDetails.Root>
                        <Stack gap="xs">
                            <Ngsi.EntityDetails.Header />
                            <Ngsi.EntityDetails.Error />
                            <Ngsi.EntityDetails.Grid colorAttributeTypes height={300} />
                        </Stack>
                    </Ngsi.EntityDetails.Root>
                </Paper>
                <Paper withBorder p="md">
                    <Stack gap="xs">
                        <Title order={5}>Pinned to urn:ngsi-ld:Camera:camera-1</Title>
                        <Ngsi.EntityDetails.Root entityId="urn:ngsi-ld:Camera:camera-1">
                            <Ngsi.EntityDetails.Header />
                            <Ngsi.EntityDetails.Grid />
                        </Ngsi.EntityDetails.Root>
                    </Stack>
                </Paper>
                <Paper withBorder p="md" h={360}>
                    <EntityJson style={{ height: "100%" }} />
                </Paper>
            </SimpleGrid>
        </Page>
    );
}
