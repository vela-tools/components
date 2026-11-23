import type { ReactNode } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { subscriptionTitle } from "../../../utils/subscriptions";
import { useSubscriptionListContext, useSubscriptionListItem } from "../SubscriptionList.context";
import { Condition } from "./Condition";
import { EditButton } from "./EditButton";
import { RemoveButton } from "./RemoveButton";
import { Status } from "./Status";
import { StatusToggle } from "./StatusToggle";
import { Types } from "./EntityTypes";
import { Unreadable } from "./Unreadable";
import type { PartProps } from "./types";

export type SubscriptionListRowProps = PartProps & { children?: ReactNode };

function DefaultContent() {
    const subscription = useSubscriptionListItem("Row");
    return (
        <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
                <Status />
                <Stack gap={4}>
                    <Text size="sm">{subscriptionTitle(subscription)}</Text>
                    <Types />
                    <Condition />
                    <Unreadable />
                </Stack>
            </Group>
            <Group gap={4} wrap="nowrap">
                <EditButton />
                <StatusToggle />
                <RemoveButton />
            </Group>
        </Group>
    );
}

export function Row({ className, style, children }: SubscriptionListRowProps) {
    const { selectedId, select } = useSubscriptionListContext("Row");
    const subscription = useSubscriptionListItem("Row");
    const selected = subscription.id === selectedId;
    return (
        <Paper
            withBorder
            p="xs"
            className={className}
            data-selected={selected || undefined}
            aria-current={select && selected ? true : undefined}
            onClick={select ? () => select(subscription) : undefined}
            bg={selected ? "var(--mantine-primary-color-light)" : undefined}
            style={{ cursor: select ? "pointer" : undefined, ...style }}
        >
            {children ?? <DefaultContent />}
        </Paper>
    );
}
