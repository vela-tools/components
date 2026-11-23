import { ActionIcon, Group, Radio, Stack } from "@mantine/core";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useBrokerConfigContext, useBrokerConfigEditing } from "../BrokerConfig.context";
import type { PartProps } from "./types";

export function List({ className, style }: PartProps) {
    const { brokers, selectedId, select, remove, canRemove } = useBrokerConfigContext("List");
    const { editing, edit } = useBrokerConfigEditing("List");
    if (editing) return null;
    return (
        <Radio.Group value={selectedId} onChange={select} className={className} style={style}>
            <Stack gap="xs">
                {brokers.map((broker) => (
                    <Group key={broker.id} justify="space-between" align="center" wrap="nowrap">
                        <Radio
                            value={broker.id}
                            label={broker.name}
                            description={broker.url}
                            styles={{ body: { minWidth: 0 } }}
                        />
                        <Group gap={4} wrap="nowrap">
                            <ActionIcon
                                size="xs"
                                variant="subtle"
                                aria-label={`Edit ${broker.name}`}
                                onClick={() => edit(broker.id)}
                            >
                                <PencilSimpleIcon size={14} />
                            </ActionIcon>
                            {remove && (
                                <ActionIcon
                                    size="xs"
                                    variant="subtle"
                                    color="red"
                                    aria-label={`Delete ${broker.name}`}
                                    disabled={canRemove ? !canRemove(broker.id) : false}
                                    onClick={() => remove(broker.id)}
                                >
                                    <TrashIcon size={14} />
                                </ActionIcon>
                            )}
                        </Group>
                    </Group>
                ))}
            </Stack>
        </Radio.Group>
    );
}
