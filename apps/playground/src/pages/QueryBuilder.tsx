import { useMemo, useState, type ReactNode } from "react";
import { Code, Group, Paper, ScrollArea, SimpleGrid, Stack, Switch, Title } from "@mantine/core";
import { Ngsi, QueryBuilder, type EntityQuery } from "@vela-tools/ngsi";
import {
    DEFAULT_QUERY_OPERATORS,
    QueryBuilder as QueryBuilderParts,
    QueryBuilderProvider,
    newQueryCondition,
    type QueryBuilderContextValue,
    type QueryBuilderDraft,
    type QueryBuilderGeo,
    type QueryBuilderSavedItem,
    type QueryBuilderType,
} from "@vela-tools/ui";
import { Page } from "../Page";

const TYPES: QueryBuilderType[] = [
    { key: "Camera", label: "Camera", count: 3, color: "#7C3AED", properties: ["status", "temperature"] },
    { key: "Sensor", label: "Sensor", count: 5, color: "#16a34a", properties: ["humidity", "temperature"] },
    { key: "Parking", label: "Parking", count: 2, color: "#d97706", properties: ["occupancy"] },
];

const PRESETS: QueryBuilderGeo[] = [
    { label: "Delft", lat: 52.01, lon: 4.36, radiusKm: 2 },
    { label: "The Hague", lat: 52.08, lon: 4.31, radiusKm: 5 },
];

const emptyDraft = (): QueryBuilderDraft => ({
    typeKeys: [],
    mode: "builder",
    conditions: [newQueryCondition()],
    text: "",
    geo: null,
});

const previewOf = (draft: QueryBuilderDraft) => {
    if (draft.mode === "text") return draft.text;
    const q = draft.conditions
        .filter((c) => c.property && c.value)
        .map((c) => `${c.property}${c.operator}${c.value}`)
        .join(";");
    return [draft.typeKeys.length > 0 && `type=${draft.typeKeys.join(",")}`, q && `q=${q}`].filter(Boolean).join("&");
};

type LocalQueryRootProps = {
    withSaved: boolean;
    busy: boolean;
    failed: boolean;
    onRun: (draft: QueryBuilderDraft) => void;
    children: ReactNode;
};

function LocalQueryRoot({ withSaved, busy, failed, onRun, children }: LocalQueryRootProps) {
    const [draft, setDraft] = useState(emptyDraft);
    const [presets, setPresets] = useState(PRESETS);
    const [saved, setSaved] = useState<(QueryBuilderSavedItem & { draft: QueryBuilderDraft })[]>([]);
    const [loadedId, setLoadedId] = useState<string | null>(null);

    const value = useMemo<QueryBuilderContextValue>(() => {
        const find = (id: string) => saved.find((s) => s.id === id);
        const load = (id: string) => {
            const item = find(id);
            if (!item) return;
            setDraft(item.draft);
            setLoadedId(id);
        };
        return {
            draft,
            setDraft,
            types: TYPES,
            typesLoading: false,
            preview: previewOf(draft),
            error: failed ? "Broker down" : null,
            busy,
            run: () => onRun(draft),
            reset: () => {
                setDraft(emptyDraft());
                setLoadedId(null);
            },
            operators: DEFAULT_QUERY_OPERATORS,
            presets,
            addPreset: (location) => setPresets((list) => [...list, location]),
            saved: withSaved
                ? {
                      items: saved,
                      loadedId,
                      load,
                      runSaved: (id) => {
                          const item = find(id);
                          if (!item) return;
                          load(id);
                          onRun(item.draft);
                      },
                      save: (name) => {
                          const id = `q${Date.now()}`;
                          setSaved((list) => [
                              ...list,
                              { id, name, createdAt: new Date().toISOString(), description: previewOf(draft), draft },
                          ]);
                          setLoadedId(id);
                      },
                      update: () =>
                          setSaved((list) =>
                              list.map((s) => (s.id === loadedId ? { ...s, draft, description: previewOf(draft) } : s)),
                          ),
                      remove: (id) => {
                          setSaved((list) => list.filter((s) => s.id !== id));
                          setLoadedId((current) => (current === id ? null : current));
                      },
                  }
                : undefined,
        };
    }, [draft, presets, saved, loadedId, withSaved, busy, failed, onRun]);

    return <QueryBuilderProvider value={value}>{children}</QueryBuilderProvider>;
}

export function QueryBuilderPage() {
    const [lastRun, setLastRun] = useState<EntityQuery | null>(null);
    const [withSaved, setWithSaved] = useState(true);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const [localRun, setLocalRun] = useState<QueryBuilderDraft | null>(null);

    return (
        <Page title="QueryBuilder" description="Run sets the provider's active query (see Selection → query).">
            <QueryBuilder onQueryRun={setLastRun} />
            <Code block>{lastRun ? JSON.stringify(lastRun, null, 2) : "onQueryRun not called yet"}</Code>

            <Title order={4}>Bound Root: custom layout, conditions and geo side by side, no saved panel</Title>
            <SimpleGrid cols={2}>
                <Paper withBorder p="md">
                    <Ngsi.QueryBuilder.Root presetLocations={PRESETS} onQueryRun={setLastRun}>
                        <SimpleGrid cols={2}>
                            <Stack gap={0}>
                                <Ngsi.QueryBuilder.EntityTypes />
                                <Ngsi.QueryBuilder.Conditions />
                            </Stack>
                            <Stack gap="xs">
                                <Ngsi.QueryBuilder.GeoRegion />
                                <Ngsi.QueryBuilder.Preview />
                                <Ngsi.QueryBuilder.Error />
                                <Ngsi.QueryBuilder.Actions />
                            </Stack>
                        </SimpleGrid>
                    </Ngsi.QueryBuilder.Root>
                </Paper>
                <Paper withBorder p="md" h={420}>
                    <Stack h="100%" gap="xs">
                        <Title order={5}>EntityList.Root follows the active query</Title>
                        <ScrollArea style={{ flex: 1 }}>
                            <Ngsi.EntityList.Root>
                                <Ngsi.EntityList.Error />
                                <Ngsi.EntityList.Empty />
                                <Ngsi.EntityList.List />
                            </Ngsi.EntityList.Root>
                        </ScrollArea>
                    </Stack>
                </Paper>
            </SimpleGrid>

            <Title order={4}>Parts with a local test Root (static types)</Title>
            <Group>
                <Switch
                    label="Saved queries"
                    checked={withSaved}
                    onChange={(e) => setWithSaved(e.currentTarget.checked)}
                />
                <Switch label="Busy" checked={busy} onChange={(e) => setBusy(e.currentTarget.checked)} />
                <Switch label="Error" checked={failed} onChange={(e) => setFailed(e.currentTarget.checked)} />
            </Group>
            <SimpleGrid cols={2}>
                <Paper withBorder h={620}>
                    <LocalQueryRoot withSaved={withSaved} busy={busy} failed={failed} onRun={setLocalRun}>
                        <Stack gap={0} h="100%">
                            <QueryBuilderParts.EntityTypes />
                            <QueryBuilderParts.Conditions>
                                <QueryBuilderParts.Preview />
                                <QueryBuilderParts.Actions />
                                <QueryBuilderParts.Error />
                            </QueryBuilderParts.Conditions>
                            <QueryBuilderParts.GeoRegion />
                            <QueryBuilderParts.SavedQueries />
                        </Stack>
                    </LocalQueryRoot>
                </Paper>
                <Paper withBorder p="md">
                    <Title order={5} mb="xs">
                        Custom layout: conditions and geo side by side, no saved panel
                    </Title>
                    <LocalQueryRoot withSaved={false} busy={busy} failed={failed} onRun={setLocalRun}>
                        <SimpleGrid cols={2}>
                            <Stack gap={0}>
                                <QueryBuilderParts.EntityTypes />
                                <QueryBuilderParts.Conditions />
                            </Stack>
                            <Stack gap="xs">
                                <QueryBuilderParts.GeoRegion />
                                <QueryBuilderParts.Preview />
                                <QueryBuilderParts.Error />
                                <QueryBuilderParts.Actions />
                            </Stack>
                        </SimpleGrid>
                    </LocalQueryRoot>
                </Paper>
            </SimpleGrid>
            <Code block>{localRun ? JSON.stringify(localRun, null, 2) : "run not called yet"}</Code>
        </Page>
    );
}
