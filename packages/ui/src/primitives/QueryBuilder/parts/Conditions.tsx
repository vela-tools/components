import { useMemo, type ReactNode } from "react";
import clsx from "clsx";
import { ActionIcon, Box, Button, Group, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { QueryBuilderDraft } from "../QueryBuilder.types";
import { newQueryCondition, removeCondition, selectedProperties, updateCondition } from "../queryBuilder.utils";
import { useQueryBuilderContext } from "../QueryBuilder.context";
import classes from "./QueryBuilder.module.css";
import type { PartProps } from "./types";
import { PartLock } from "./PartLock";

export type QueryBuilderConditionsProps = PartProps & { children?: ReactNode };

const modeButtonStyles = { root: { height: 22, padding: "0 10px", fontSize: 10 } };

export function Conditions({ className, style, children }: QueryBuilderConditionsProps) {
    const { types, draft, setDraft, preview, operators, reset } = useQueryBuilderContext("Conditions");

    const properties = useMemo(() => selectedProperties(types, draft.typeKeys), [types, draft.typeKeys]);
    const { conditions } = draft;

    const setConditions = (next: QueryBuilderDraft["conditions"]) => setDraft({ ...draft, conditions: next });

    return (
        <PartLock part="conditions">
            <Box className={clsx(classes.conditions, className)} style={style}>
                <Group justify="space-between" mb={6}>
                    <Text className={classes.sectionHeader}>Query</Text>
                    <Group gap={2}>
                        <Button
                            size="xs"
                            variant={draft.mode === "builder" ? "filled" : "subtle"}
                            color="violet"
                            onClick={() => draft.mode !== "builder" && setDraft({ ...draft, mode: "builder" })}
                            styles={modeButtonStyles}
                        >
                            Builder
                        </Button>
                        <Button
                            size="xs"
                            variant={draft.mode === "text" ? "filled" : "subtle"}
                            color="violet"
                            onClick={() => draft.mode !== "text" && setDraft({ ...draft, mode: "text", text: preview })}
                            styles={modeButtonStyles}
                        >
                            Text
                        </Button>
                    </Group>
                </Group>

                <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    fullWidth
                    onClick={reset}
                    mb={8}
                    styles={{ root: { height: 24, fontSize: 11 } }}
                >
                    New query
                </Button>

                <Stack gap={6}>
                    {draft.mode === "builder" ? (
                        <>
                            <Box className={`${classes.conditionRows} vela-thin-scroll`}>
                                <Stack gap={6}>
                                    {conditions.map((condition) => (
                                        <Group key={condition.id} gap={4} align="center" wrap="nowrap">
                                            <Select
                                                placeholder="Property"
                                                aria-label="Property"
                                                size="xs"
                                                searchable
                                                filter={({ options, search }) =>
                                                    options.filter(
                                                        (o) =>
                                                            "value" in o &&
                                                            o.value.toLowerCase().startsWith(search.toLowerCase()),
                                                    )
                                                }
                                                data={properties}
                                                value={condition.property || null}
                                                onChange={(v) =>
                                                    setConditions(
                                                        updateCondition(conditions, condition.id, "property", v ?? ""),
                                                    )
                                                }
                                                style={{ flex: 2, minWidth: 0 }}
                                                classNames={{ input: classes.conditionInput }}
                                            />
                                            <Select
                                                placeholder="Op"
                                                aria-label="Operator"
                                                size="xs"
                                                data={operators}
                                                value={condition.operator}
                                                allowDeselect={false}
                                                onChange={(v) =>
                                                    setConditions(
                                                        updateCondition(
                                                            conditions,
                                                            condition.id,
                                                            "operator",
                                                            v ?? operators[0]?.value ?? ">",
                                                        ),
                                                    )
                                                }
                                                style={{ flex: 1, minWidth: 0 }}
                                                classNames={{ input: classes.conditionInput }}
                                                styles={{ input: { paddingLeft: 6 } }}
                                            />
                                            <TextInput
                                                placeholder="Value"
                                                aria-label="Value"
                                                size="xs"
                                                value={condition.value}
                                                onChange={(e) =>
                                                    setConditions(
                                                        updateCondition(
                                                            conditions,
                                                            condition.id,
                                                            "value",
                                                            e.currentTarget.value,
                                                        ),
                                                    )
                                                }
                                                style={{ flex: 2, minWidth: 0 }}
                                                classNames={{ input: classes.conditionInput }}
                                            />
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                color="gray"
                                                aria-label="Remove condition"
                                                onClick={() => setConditions(removeCondition(conditions, condition.id))}
                                                disabled={conditions.length === 1}
                                                tabIndex={-1}
                                                style={{ flexShrink: 0, opacity: conditions.length === 1 ? 0 : 1 }}
                                            >
                                                <TrashIcon size={12} />
                                            </ActionIcon>
                                        </Group>
                                    ))}
                                </Stack>
                            </Box>

                            <Button
                                size="xs"
                                variant="subtle"
                                color="gray"
                                leftSection={<PlusIcon size={11} />}
                                onClick={() => setConditions([...conditions, newQueryCondition()])}
                                styles={{
                                    root: { height: 24, fontSize: 11, padding: "0 8px", alignSelf: "flex-start" },
                                }}
                            >
                                Add Condition
                            </Button>
                        </>
                    ) : (
                        <Textarea
                            value={draft.text}
                            onChange={(e) => setDraft({ ...draft, text: e.currentTarget.value })}
                            placeholder="e.g. type=WeatherObserved&q=temperature>25"
                            aria-label="Query text"
                            autosize
                            minRows={3}
                            maxRows={8}
                            size="xs"
                            classNames={{ input: classes.queryText }}
                        />
                    )}
                    {children}
                </Stack>
            </Box>
        </PartLock>
    );
}
