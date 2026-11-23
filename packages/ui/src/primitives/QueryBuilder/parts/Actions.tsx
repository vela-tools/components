import { useState } from "react";
import { Button, Group, Popover, Stack, TextInput } from "@mantine/core";
import { useQueryBuilderContext } from "../QueryBuilder.context";
import type { PartProps } from "./types";

const actionButtonStyles = { root: { height: 26, fontSize: 11 } };

export function Actions({ className, style }: PartProps) {
    const { busy, run, saved } = useQueryBuilderContext("Actions");
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState("");

    const loaded = !!saved?.loadedId;
    const canSave = saved !== undefined && (loaded ? !!saved.update : !!saved.save);

    const closeSave = () => {
        setSaveOpen(false);
        setSaveName("");
    };

    const submitSave = () => {
        const name = saveName.trim();
        if (!name || busy) return;
        saved?.save?.(name);
        closeSave();
    };

    const saveButton = !canSave ? null : loaded ? (
        <Button
            size="xs"
            variant="light"
            color="violet"
            style={{ flex: 1 }}
            styles={actionButtonStyles}
            disabled={busy}
            onClick={() => saved?.update?.()}
        >
            Save
        </Button>
    ) : (
        <Popover opened={saveOpen} onClose={closeSave} width={200} position="bottom-end" withArrow withinPortal>
            <Popover.Target>
                <Button
                    size="xs"
                    variant="light"
                    color="violet"
                    style={{ flex: 1 }}
                    styles={actionButtonStyles}
                    disabled={busy}
                    onClick={() => setSaveOpen((open) => !open)}
                >
                    Save
                </Button>
            </Popover.Target>
            <Popover.Dropdown style={{ padding: 10 }}>
                <Stack gap={6}>
                    <TextInput
                        placeholder="Query name…"
                        aria-label="Query name"
                        size="xs"
                        value={saveName}
                        onChange={(e) => setSaveName(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitSave()}
                        data-autofocus
                        styles={{ input: { fontSize: 11 } }}
                    />
                    <Button
                        size="xs"
                        variant="filled"
                        color="violet"
                        disabled={!saveName.trim() || busy}
                        onClick={submitSave}
                        styles={actionButtonStyles}
                        fullWidth
                    >
                        Save Query
                    </Button>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );

    if (!run && !saveButton) return null;

    return (
        <Group gap={6} mt={2} className={className} style={style}>
            {run && (
                <Button
                    size="xs"
                    variant="filled"
                    color="violet"
                    style={{ flex: 1 }}
                    styles={actionButtonStyles}
                    disabled={busy}
                    onClick={run}
                >
                    Run
                </Button>
            )}
            {saveButton}
        </Group>
    );
}
