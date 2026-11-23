import { useMemo, useState } from "react";
import { AppShell, Badge, Divider, Group, NavLink, ScrollArea, Stack, Title } from "@mantine/core";
import { NgsiProvider } from "@vela-tools/ngsi";
import { AdapterControls } from "./AdapterControls";
import { SelectionPanel } from "./SelectionPanel";
import { brokerInfo, createAdapters, DEFAULT_SETTINGS, type AdapterSettings } from "./adapters";
import { PAGES } from "./pages";

export function App() {
    const [settings, setSettings] = useState<AdapterSettings>(DEFAULT_SETTINGS);
    const [revision, setRevision] = useState(0);
    const [pageId, setPageId] = useState(PAGES[0].id);

    const adapters = useMemo(() => createAdapters(settings), [settings]);
    const broker = useMemo(() => brokerInfo(settings, revision), [settings, revision]);

    const changeSettings = (next: AdapterSettings) => {
        setSettings(next);
        setRevision((r) => r + 1);
    };

    const page = PAGES.find((p) => p.id === pageId) ?? PAGES[0];
    const Content = page.component;

    return (
        <NgsiProvider key={broker.id} broker={broker} adapters={adapters}>
            <AppShell
                header={{ height: 56 }}
                navbar={{ width: 200, breakpoint: "sm" }}
                aside={{ width: 320, breakpoint: "md" }}
                padding="md"
            >
                <AppShell.Header>
                    <Group h="100%" px="md" justify="space-between">
                        <Title order={4}>Vela playground</Title>
                        <Badge variant="light">{broker.name}</Badge>
                    </Group>
                </AppShell.Header>
                <AppShell.Navbar p="xs">
                    {PAGES.map((p) => (
                        <NavLink key={p.id} label={p.label} active={p.id === page.id} onClick={() => setPageId(p.id)} />
                    ))}
                </AppShell.Navbar>
                <AppShell.Main>
                    <Content />
                </AppShell.Main>
                <AppShell.Aside>
                    <ScrollArea p="md">
                        <Stack>
                            <AdapterControls settings={settings} onChange={changeSettings} />
                            <Divider />
                            <SelectionPanel />
                        </Stack>
                    </ScrollArea>
                </AppShell.Aside>
            </AppShell>
        </NgsiProvider>
    );
}
