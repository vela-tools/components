import { useState } from "react";
import { Code, Group, Paper, SegmentedControl, SimpleGrid, Switch, Title } from "@mantine/core";
import { BrokerStatus, Ngsi, useNgsi } from "@vela-tools/ngsi";
import { ConnectionStatusCard, ConnectionStatusProvider, type ConnectionStatus } from "@vela-tools/ui";
import { Page } from "../Page";

function BrokerDetails() {
    const { broker, capabilities } = useNgsi();
    return <Code block>{JSON.stringify({ broker, capabilities }, null, 2)}</Code>;
}

const STATUSES: ConnectionStatus[] = ["connecting", "connected", "error"];

export function BrokerStatusPage() {
    const [status, setStatus] = useState<ConnectionStatus>("connected");
    const [withDetails, setWithDetails] = useState(true);

    return (
        <Page
            title="BrokerStatus"
            description="Connecting while types load, connected on success, error when entities.listTypes fails. Click for details."
        >
            <BrokerStatus details={<BrokerDetails />} style={{ maxWidth: 360 }} />

            <Title order={4}>Bound Root: custom layouts</Title>
            <SimpleGrid cols={2}>
                <Paper withBorder p="md">
                    <Ngsi.ConnectionStatus.Root details={<BrokerDetails />}>
                        <Ngsi.ConnectionStatus.Card style={{ width: "auto", maxWidth: "none" }}>
                            <Group justify="space-between" wrap="nowrap">
                                <Ngsi.ConnectionStatus.Name />
                                <Ngsi.ConnectionStatus.Indicator label="NGSI-LD" />
                            </Group>
                        </Ngsi.ConnectionStatus.Card>
                        <Ngsi.ConnectionStatus.DetailsModal title="Broker details" />
                    </Ngsi.ConnectionStatus.Root>
                </Paper>
                <Paper withBorder p="md">
                    <Ngsi.ConnectionStatus.Root>
                        <Ngsi.ConnectionStatus.Indicator />
                    </Ngsi.ConnectionStatus.Root>
                </Paper>
            </SimpleGrid>

            <Title order={4}>Parts with a static value</Title>
            <Group>
                <SegmentedControl
                    data={STATUSES}
                    value={status}
                    onChange={(value) => setStatus(value as ConnectionStatus)}
                />
                <Switch
                    label="Details"
                    checked={withDetails}
                    onChange={(e) => setWithDetails(e.currentTarget.checked)}
                />
            </Group>
            <ConnectionStatusProvider
                value={{
                    name: "Static broker",
                    url: "https://broker.example/ngsi-ld/v1",
                    status,
                    error: status === "error" ? "Broker down" : undefined,
                    details: withDetails ? <Code block>static details</Code> : undefined,
                }}
            >
                <ConnectionStatusCard.Card />
                <ConnectionStatusCard.DetailsModal />
            </ConnectionStatusProvider>
        </Page>
    );
}
