import type { KeyboardEvent, MouseEvent } from "react";
import clsx from "clsx";
import { ActionIcon, Box, Group, Text, Tooltip } from "@mantine/core";
import { BookmarkSimpleIcon, PlayIcon, TrashIcon } from "@phosphor-icons/react";
import { useQueryBuilderContext } from "../QueryBuilder.context";
import classes from "./QueryBuilder.module.css";
import type { PartProps } from "./types";

export function SavedQueries({ className, style }: PartProps) {
    const { saved, busy } = useQueryBuilderContext("SavedQueries");
    if (!saved) return null;
    const { items, loadedId, load, runSaved, remove } = saved;

    const onRowKey = (id: string) => (e: KeyboardEvent) => {
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        load(id);
    };

    const action = (run: (id: string) => void, id: string) => (e: MouseEvent) => {
        e.stopPropagation();
        run(id);
    };

    return (
        <Box className={clsx(classes.saved, className)} style={style}>
            <Group style={{ padding: "7px 12px 5px", flexShrink: 0 }} gap={5}>
                <BookmarkSimpleIcon size={12} color="var(--vela-color-text4)" />
                <Text className={classes.sectionHeader}>Saved queries</Text>
            </Group>

            <Box style={{ overflowY: "auto" }} className="vela-thin-scroll">
                {items.length === 0 ? (
                    <Text c="var(--vela-color-text4)" style={{ fontSize: 11, padding: "2px 12px 8px" }}>
                        No saved queries.
                    </Text>
                ) : (
                    items.map((q) => (
                        <Box
                            key={q.id}
                            role="button"
                            tabIndex={0}
                            aria-current={q.id === loadedId || undefined}
                            data-active={q.id === loadedId}
                            className={classes.queryRow}
                            onClick={() => load(q.id)}
                            onKeyDown={onRowKey(q.id)}
                        >
                            <Box style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                                <Text c="var(--vela-color-text)" fw={500} className={classes.queryRowName}>
                                    {q.name}
                                </Text>
                                {q.description && (
                                    <Text c="var(--vela-color-text4)" className={classes.queryRowDescription}>
                                        {q.description}
                                    </Text>
                                )}
                            </Box>
                            <Group gap={2} className={classes.queryRowActions}>
                                {runSaved && (
                                    <Tooltip label="Run" position="left" withArrow>
                                        <ActionIcon
                                            size="xs"
                                            variant="subtle"
                                            color="violet"
                                            aria-label={`Run ${q.name}`}
                                            disabled={busy}
                                            onClick={action(runSaved, q.id)}
                                        >
                                            <PlayIcon size={10} weight="fill" />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                                {remove && (
                                    <Tooltip label="Delete" position="left" withArrow>
                                        <ActionIcon
                                            size="xs"
                                            variant="subtle"
                                            color="red"
                                            aria-label={`Delete ${q.name}`}
                                            disabled={busy}
                                            onClick={action(remove, q.id)}
                                        >
                                            <TrashIcon size={10} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                        </Box>
                    ))
                )}
            </Box>
        </Box>
    );
}
