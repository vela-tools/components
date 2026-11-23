import { Code, Paper, Text } from "@mantine/core";
import { BrokerConnector, NgsiBrokersProvider, useNgsi, useNgsiBrokers, type NgsiBroker } from "@vela-tools/ngsi";
import { createMockNgsiAdapter } from "@vela-tools/ngsi/testing";
import { ToolBar } from "@vela-tools/ui";
import { Page } from "../Page";

const STORAGE_KEY = "playground.brokers";

const DEFAULT_BROKERS = [
    { name: "Mock broker", url: "https://mock.example/ngsi-ld/v1" },
    { name: "Down broker", url: "https://down.example/ngsi-ld/v1" },
];

const createAdapters = (broker: NgsiBroker) =>
    createMockNgsiAdapter(undefined, {
        latencyMs: 400,
        failOn: broker.url.includes("down") ? ["entities.listTypes"] : [],
    });

function State() {
    const { brokers, selected } = useNgsiBrokers();
    const { broker } = useNgsi();
    return <Code block>{JSON.stringify({ selected: selected.id, runtime: broker, brokers }, null, 2)}</Code>;
}

export function BrokerConnectorPage() {
    return (
        <Page
            title="BrokerConnector"
            description="NgsiBrokersProvider owns the broker list (kept in localStorage here) and connects the runtime to the selected one. URLs containing 'down' fail."
        >
            <NgsiBrokersProvider
                defaultBrokers={DEFAULT_BROKERS}
                storageKey={STORAGE_KEY}
                createAdapters={createAdapters}
            >
                <Paper withBorder style={{ overflow: "hidden" }}>
                    <ToolBar>
                        <BrokerConnector />
                    </ToolBar>
                </Paper>
                <Text size="sm" fw={500}>
                    State
                </Text>
                <State />
            </NgsiBrokersProvider>
        </Page>
    );
}
