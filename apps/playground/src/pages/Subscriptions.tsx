import { useMemo, useState, type ReactNode } from "react";
import { Alert, Badge, Code, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Ngsi, SubscriptionManager } from "@vela-tools/ngsi";
import {
    NotificationList,
    NotificationListProvider,
    SubscriptionEditor,
    SubscriptionEditorProvider,
    SubscriptionList,
    SubscriptionListProvider,
    emptyEditorValues,
    subscriptionTitle,
    type NotificationRecord,
    type SubscriptionEditorContextValue,
    type SubscriptionEditorValues,
    type SubscriptionListContextValue,
    type SubscriptionRecord,
} from "@vela-tools/ui";
import { Page } from "../Page";

const ATTRIBUTES = ["status", "temperature", "humidity", "battery"];

function LocalEditorRoot({
    onSubmit,
    children,
}: {
    onSubmit: (values: SubscriptionEditorValues) => void;
    children: ReactNode;
}) {
    const [values, setValues] = useState(emptyEditorValues);
    const value = useMemo<SubscriptionEditorContextValue>(
        () => ({
            values,
            setField: (field, next) => setValues((v) => ({ ...v, [field]: next })),
            availableAttributes: ATTRIBUTES,
            invalid: new Set(),
            submitting: false,
            submit: () => onSubmit(values),
            cancel: () => setValues(emptyEditorValues),
            submitLabel: "Log draft",
        }),
        [values, onSubmit],
    );
    return <SubscriptionEditorProvider value={value}>{children}</SubscriptionEditorProvider>;
}

function PartsDemo() {
    const [submitted, setSubmitted] = useState<SubscriptionEditorValues | null>(null);
    return (
        <Paper withBorder p="md">
            <Stack>
                <Title order={5}>SubscriptionEditor parts (local test Root, two columns)</Title>
                <LocalEditorRoot onSubmit={setSubmitted}>
                    <SubscriptionEditor.Form>
                        <Stack gap="sm">
                            <SimpleGrid cols={2}>
                                <SubscriptionEditor.Name />
                                <SubscriptionEditor.WatchedAttributes />
                                <SubscriptionEditor.Description />
                                <SubscriptionEditor.Endpoint />
                                <SubscriptionEditor.NotifyWhen />
                                <SubscriptionEditor.ExpiresAt />
                                <SubscriptionEditor.ScopeQuery />
                                <SubscriptionEditor.Lang />
                                <SubscriptionEditor.Format />
                                <SubscriptionEditor.Payload />
                            </SimpleGrid>
                            <SubscriptionEditor.Advanced />
                            <SubscriptionEditor.Error />
                            <Group justify="flex-end">
                                <SubscriptionEditor.Actions />
                            </Group>
                        </Stack>
                    </SubscriptionEditor.Form>
                </LocalEditorRoot>
                <Code block>{submitted ? JSON.stringify(submitted, null, 2) : "submit not called yet"}</Code>
            </Stack>
        </Paper>
    );
}

const SUBSCRIPTIONS: SubscriptionRecord[] = [
    {
        id: "urn:ngsi-ld:Subscription:1",
        name: "Hot camera",
        description: "Cameras running above 30 degrees",
        expiresAt: "2027-01-15T09:30:00Z",
        types: ["Camera", "Sensor"],
        watchedAttributes: ["temperature"],
        q: "temperature>30",
        status: "active",
        delivery: {
            status: "failed",
            timesSent: 4,
            timesFailed: 1,
            lastNotification: "2026-11-13T10:00:00Z",
            lastFailure: "2026-11-13T10:00:00Z",
        },
    },
    {
        id: "urn:ngsi-ld:Subscription:2",
        description: "Dry sensor",
        types: ["Sensor"],
        watchedAttributes: [],
        q: "humidity<10",
        geo: { label: "Delft", lat: 52.01, lon: 4.36, radiusKm: 2 },
        status: "paused",
    },
    {
        id: "urn:ngsi-ld:Subscription:3",
        name: "Old battery check",
        types: ["Sensor"],
        watchedAttributes: [],
        q: "battery<20",
        expiresAt: "2026-01-01T00:00:00Z",
        status: "expired",
    },
];

const NOTIFICATIONS: NotificationRecord[] = [
    {
        id: "n1",
        subscriptionId: "urn:ngsi-ld:Subscription:1",
        receivedAt: "2026-11-13T10:00:00Z",
        status: "delivered",
        source: "urn:ngsi-ld:Camera:camera-1",
        payload: { temperature: 31 },
    },
    {
        id: "n2",
        subscriptionId: "urn:ngsi-ld:Subscription:2",
        receivedAt: "2026-11-13T11:00:00Z",
        status: "failed",
        source: "urn:ngsi-ld:Sensor:S01",
        payload: { humidity: 8 },
    },
];

const NAMES = Object.fromEntries(SUBSCRIPTIONS.map((s) => [s.id, subscriptionTitle(s)]));

function LocalListRoot({ children }: { children: ReactNode }) {
    const [subscriptions, setSubscriptions] = useState(SUBSCRIPTIONS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const value = useMemo<SubscriptionListContextValue>(
        () => ({
            subscriptions,
            selectedId,
            select: (s) => setSelectedId(s.id),
            toggleStatus: (s, status) =>
                setSubscriptions((all) => all.map((x) => (x.id === s.id ? { ...x, status } : x))),
            pendingIds: [],
            stale: false,
        }),
        [subscriptions, selectedId],
    );
    return <SubscriptionListProvider value={value}>{children}</SubscriptionListProvider>;
}

function ListPartsDemo() {
    return (
        <Paper withBorder p="md">
            <Stack>
                <Title order={5}>SubscriptionList parts (local test Root, no remove)</Title>
                <LocalListRoot>
                    <SubscriptionList.Table columns={["status", "name", "condition", "expires", "actions"]} />
                    <SubscriptionList.Rows>
                        {(s) => (
                            <SubscriptionList.Row>
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <SubscriptionList.Status />
                                        <Text size="sm">{subscriptionTitle(s)}</Text>
                                        <SubscriptionList.Types />
                                    </Group>
                                    <SubscriptionList.StatusToggle />
                                </Group>
                            </SubscriptionList.Row>
                        )}
                    </SubscriptionList.Rows>
                    <SubscriptionList.Empty />
                </LocalListRoot>
                <Title order={5}>NotificationList parts (grouped under a header)</Title>
                <NotificationListProvider
                    value={{ notifications: NOTIFICATIONS, subscriptionNames: NAMES, stale: false }}
                >
                    <Group gap="xs">
                        <Text fw={600}>Recent alerts</Text>
                        <Badge size="sm">{NOTIFICATIONS.length}</Badge>
                    </Group>
                    <NotificationList.Items />
                    <NotificationList.Empty />
                </NotificationListProvider>
            </Stack>
        </Paper>
    );
}

function BoundRootsDemo() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [created, setCreated] = useState<string | null>(null);
    return (
        <Paper withBorder p="md">
            <Stack>
                <Title order={5}>Bound Roots (custom layout on the runtime)</Title>
                <SimpleGrid cols={2}>
                    <Ngsi.SubscriptionEditor.Root onCreated={(s) => setCreated(subscriptionTitle(s))}>
                        <Ngsi.SubscriptionEditor.Form>
                            <Stack gap="sm">
                                <Ngsi.SubscriptionEditor.Name />
                                <Ngsi.SubscriptionEditor.Description />
                                <Ngsi.SubscriptionEditor.Endpoint />
                                <Ngsi.QueryBuilder.EntityTypes />
                                <Ngsi.QueryBuilder.Conditions>
                                    <Ngsi.QueryBuilder.Preview />
                                </Ngsi.QueryBuilder.Conditions>
                                <Ngsi.QueryBuilder.GeoRegion />
                                <Ngsi.SubscriptionEditor.NotifyWhen />
                                <Ngsi.SubscriptionEditor.WatchedAttributes />
                                <Ngsi.SubscriptionEditor.ExpiresAt />
                                <Ngsi.SubscriptionEditor.ScopeQuery />
                                <Ngsi.SubscriptionEditor.Lang />
                                <Ngsi.SubscriptionEditor.Format />
                                <Ngsi.SubscriptionEditor.Payload />
                                <Ngsi.SubscriptionEditor.Advanced />
                                <Ngsi.SubscriptionEditor.Error />
                                <Ngsi.SubscriptionEditor.Actions />
                                {created && (
                                    <Text size="xs" c="teal">
                                        Created: {created}
                                    </Text>
                                )}
                            </Stack>
                        </Ngsi.SubscriptionEditor.Form>
                    </Ngsi.SubscriptionEditor.Root>
                    <Stack>
                        <Ngsi.SubscriptionList.Root selectedId={selectedId} onSelect={setSelectedId}>
                            <Ngsi.SubscriptionList.Error />
                            <Ngsi.SubscriptionList.Table columns={["status", "name", "actions"]} pageSize={5} />
                        </Ngsi.SubscriptionList.Root>
                        <Ngsi.NotificationList.Root subscriptionId={selectedId ?? undefined} limit={20}>
                            <Text fw={600}>{selectedId ? "Alerts for the selected subscription" : "All alerts"}</Text>
                            <Ngsi.NotificationList.Error />
                            <Ngsi.NotificationList.Items />
                            <Ngsi.NotificationList.Empty />
                        </Ngsi.NotificationList.Root>
                    </Stack>
                </SimpleGrid>
            </Stack>
        </Paper>
    );
}

export function SubscriptionsPage() {
    return (
        <Page
            title="SubscriptionManager"
            description="Create, toggle and remove subscriptions; select one to filter its notifications."
        >
            <SubscriptionManager fallback={<Alert color="gray">The adapter has no subscriptions capability.</Alert>} />
            <BoundRootsDemo />
            <PartsDemo />
            <ListPartsDemo />
        </Page>
    );
}
