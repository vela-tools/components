import { useMemo, useState, type ReactNode } from "react";
import { Badge, Code, Group, Paper, SimpleGrid, Stack, Switch, TextInput, Title } from "@mantine/core";
import { Ngsi } from "@vela-tools/ngsi";
import { ItemPicker, ItemPickerProvider, type ItemPickerContextValue } from "@vela-tools/ui";
import { Page } from "../Page";

type Fruit = { id: string; name: string; color: string };

const FRUITS: Fruit[] = [
    { id: "apple", name: "Apple", color: "red" },
    { id: "banana", name: "Banana", color: "yellow" },
    { id: "cherry", name: "Cherry", color: "red" },
    { id: "kiwi", name: "Kiwi", color: "green" },
    { id: "lime", name: "Lime", color: "green" },
];

const getId = (fruit: Fruit) => fruit.id;
const getName = (fruit: Fruit) => fruit.name;

type LocalPickerRootProps = {
    items: Fruit[];
    onUse?: (id: string) => void;
    loading?: boolean;
    stale?: boolean;
    error?: string | null;
    children: ReactNode;
};

function LocalPickerRoot({ items, onUse, loading = false, stale = false, error, children }: LocalPickerRootProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const value = useMemo<ItemPickerContextValue<Fruit>>(
        () => ({
            items,
            getId,
            getName,
            selectedId,
            select: setSelectedId,
            use: onUse,
            loading,
            stale,
            error,
            emptyText: "No fruit",
        }),
        [items, selectedId, onUse, loading, stale, error],
    );
    return <ItemPickerProvider value={value}>{children}</ItemPickerProvider>;
}

function PickerColumn({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Paper withBorder p="md" h={340}>
            <Stack h="100%" gap="xs">
                <Title order={6}>{title}</Title>
                {children}
            </Stack>
        </Paper>
    );
}

const pickerParts = (
    <>
        <ItemPicker.Error />
        <ItemPicker.Filter />
        <ItemPicker.Empty />
        <ItemPicker.List />
    </>
);

function BoundRoots() {
    const [controlledId, setControlledId] = useState<string | null>(null);
    const [pinnedId, setPinnedId] = useState("urn:ngsi-ld:Camera:camera-1");
    const [used, setUsed] = useState<string | null>(null);

    return (
        <Stack>
            <Title order={4}>Bound Roots</Title>
            <Title order={5}>Shared: the three lists follow each other (watch the Selection panel)</Title>
            <SimpleGrid cols={3}>
                <PickerColumn title="TypeList.Root">
                    <Ngsi.TypeList.Root>{pickerParts}</Ngsi.TypeList.Root>
                </PickerColumn>
                <PickerColumn title="EntityList.Root">
                    <Ngsi.EntityList.Root>{pickerParts}</Ngsi.EntityList.Root>
                </PickerColumn>
                <PickerColumn title="AttributeList.Root">
                    <Ngsi.AttributeList.Root onUse={(attribute, entity) => setUsed(`${entity.id} / ${attribute}`)}>
                        {pickerParts}
                    </Ngsi.AttributeList.Root>
                </PickerColumn>
            </SimpleGrid>
            <Code block>{used ? `onUse(${used})` : "onUse not called yet"}</Code>
            <Title order={5}>Independent lists</Title>
            <SimpleGrid cols={3}>
                <PickerColumn title='EntityList.Root selection="local"'>
                    <Ngsi.EntityList.Root selection="local">{pickerParts}</Ngsi.EntityList.Root>
                </PickerColumn>
                <PickerColumn title={`Controlled (page state: ${controlledId ?? "null"})`}>
                    <Ngsi.EntityList.Root selectedId={controlledId} onSelect={setControlledId}>
                        {pickerParts}
                    </Ngsi.EntityList.Root>
                </PickerColumn>
                <PickerColumn title="AttributeList.Root pinned to an entity">
                    <TextInput size="xs" value={pinnedId} onChange={(e) => setPinnedId(e.currentTarget.value)} />
                    <Ngsi.AttributeList.Root entityId={pinnedId} selection="shared">
                        {pickerParts}
                    </Ngsi.AttributeList.Root>
                </PickerColumn>
            </SimpleGrid>
        </Stack>
    );
}

export function PickersPage() {
    const [used, setUsed] = useState<string | null>(null);
    const [empty, setEmpty] = useState(false);
    const [stale, setStale] = useState(false);
    const [failed, setFailed] = useState(false);
    const items = empty ? [] : FRUITS;

    return (
        <Page title="Pickers" description="ItemPicker parts with a local test Root (static items).">
            <Group>
                <Switch label="No items" checked={empty} onChange={(e) => setEmpty(e.currentTarget.checked)} />
                <Switch label="Stale" checked={stale} onChange={(e) => setStale(e.currentTarget.checked)} />
                <Switch label="Error" checked={failed} onChange={(e) => setFailed(e.currentTarget.checked)} />
            </Group>
            <SimpleGrid cols={2}>
                <Paper withBorder p="md" h={380}>
                    <Stack h="100%" gap="xs">
                        <Title order={5}>Parts, default layout</Title>
                        <LocalPickerRoot
                            items={items}
                            onUse={setUsed}
                            stale={stale}
                            error={failed ? "Broker down" : null}
                        >
                            <ItemPicker.Header title="Fruit" />
                            <ItemPicker.Error />
                            <ItemPicker.Filter />
                            <ItemPicker.Empty />
                            <ItemPicker.List />
                        </LocalPickerRoot>
                    </Stack>
                </Paper>
                <Paper withBorder p="md" h={380}>
                    <Stack h="100%" gap="xs">
                        <Title order={5}>Parts, custom rows</Title>
                        <LocalPickerRoot items={items} onUse={setUsed} stale={stale}>
                            <ItemPicker.Filter placeholder="Filter fruit" />
                            <ItemPicker.Empty />
                            <ItemPicker.List>
                                {(item) => {
                                    const fruit = item as Fruit;
                                    return (
                                        <Group wrap="nowrap" gap="xs">
                                            <Badge color={fruit.color} variant="dot">
                                                {fruit.color}
                                            </Badge>
                                            <ItemPicker.Item>{fruit.name}</ItemPicker.Item>
                                        </Group>
                                    );
                                }}
                            </ItemPicker.List>
                        </LocalPickerRoot>
                    </Stack>
                </Paper>
            </SimpleGrid>
            <Code block>{used ? `use("${used}")` : "use not called yet"}</Code>
            <BoundRoots />
        </Page>
    );
}
