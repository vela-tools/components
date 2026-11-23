import { useState } from "react";
import { Group, Pagination, Stack, Table as MantineTable, Text } from "@mantine/core";
import type { SubscriptionRecord } from "../../../utils/subscriptions.types";
import { formatTime, pageCount, pageItems, subscriptionTitle } from "../../../utils/subscriptions";
import { staleProps } from "../../staleStyle";
import { SubscriptionListItemProvider, useSubscriptionListContext } from "../SubscriptionList.context";
import { Condition } from "./Condition";
import { Delivery } from "./Delivery";
import { Endpoint } from "./Endpoint";
import { EditButton } from "./EditButton";
import { Payload } from "./Payload";
import { RemoveButton } from "./RemoveButton";
import { Status } from "./Status";
import { StatusToggle } from "./StatusToggle";
import { Types } from "./EntityTypes";
import { Unreadable } from "./Unreadable";
import type { PartProps } from "./types";

export type SubscriptionListColumn =
    "status" | "name" | "types" | "condition" | "watched" | "expires" | "notification" | "delivery" | "actions";

export type SubscriptionListAction = "edit" | "toggle" | "remove";

export type SubscriptionListTableProps = PartProps & {
    columns?: SubscriptionListColumn[];
    actions?: SubscriptionListAction[];
    pageSize?: number;
};

const ALL_COLUMNS: SubscriptionListColumn[] = [
    "status",
    "name",
    "types",
    "condition",
    "watched",
    "expires",
    "notification",
    "delivery",
    "actions",
];
const ALL_ACTIONS: SubscriptionListAction[] = ["edit", "toggle", "remove"];

const HEADERS: Record<SubscriptionListColumn, string | null> = {
    status: null,
    name: "Name",
    types: "Types",
    condition: "Condition",
    watched: "Watched",
    expires: "Expires",
    notification: "Notification",
    delivery: "Delivery",
    actions: null,
};

function Cell({
    column,
    subscription,
    actions,
}: {
    column: SubscriptionListColumn;
    subscription: SubscriptionRecord;
    actions: SubscriptionListAction[];
}) {
    switch (column) {
        case "status":
            return (
                <MantineTable.Td>
                    <Status />
                </MantineTable.Td>
            );
        case "name":
            return (
                <MantineTable.Td>
                    {subscriptionTitle(subscription)}
                    <Unreadable />
                </MantineTable.Td>
            );
        case "types":
            return (
                <MantineTable.Td>
                    <Types />
                </MantineTable.Td>
            );
        case "condition":
            return (
                <MantineTable.Td>
                    <Condition />
                </MantineTable.Td>
            );
        case "watched":
            return (
                <MantineTable.Td c={subscription.watchedAttributes.length ? undefined : "dimmed"}>
                    {subscription.watchedAttributes.length
                        ? subscription.watchedAttributes.join(", ")
                        : "All attributes"}
                </MantineTable.Td>
            );
        case "expires":
            return (
                <MantineTable.Td c={subscription.status === "expired" ? "dimmed" : undefined}>
                    {formatTime(subscription.expiresAt)}
                </MantineTable.Td>
            );
        case "notification":
            return (
                <MantineTable.Td>
                    <Stack gap={2}>
                        <Payload />
                        <Endpoint />
                    </Stack>
                </MantineTable.Td>
            );
        case "delivery":
            return (
                <MantineTable.Td>
                    <Delivery />
                </MantineTable.Td>
            );
        case "actions":
            return (
                <MantineTable.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap" onClick={(event) => event.stopPropagation()}>
                        {actions.includes("edit") && <EditButton />}
                        {actions.includes("toggle") && <StatusToggle />}
                        {actions.includes("remove") && <RemoveButton />}
                    </Group>
                </MantineTable.Td>
            );
    }
}

export function Table({
    columns = ALL_COLUMNS,
    actions = ALL_ACTIONS,
    pageSize = 20,
    className,
    style,
}: SubscriptionListTableProps) {
    const {
        subscriptions,
        selectedId,
        select,
        toggleStatus,
        remove,
        edit,
        stale,
        emptyText = "No subscriptions",
    } = useSubscriptionListContext("Table");
    const [page, setPage] = useState(1);
    const total = pageCount(subscriptions.length, pageSize);
    const current = Math.min(page, total);
    const rows = pageItems(subscriptions, current, pageSize);
    const hasActions =
        (actions.includes("edit") && !!edit) ||
        (actions.includes("toggle") && !!toggleStatus) ||
        (actions.includes("remove") && !!remove);
    const shown = columns.filter((column) => column !== "actions" || hasActions);

    return (
        <Stack gap="xs" className={className} style={style}>
            <MantineTable highlightOnHover={!!select} {...staleProps(stale)}>
                <MantineTable.Thead>
                    <MantineTable.Tr>
                        {shown.map((column) => (
                            <MantineTable.Th key={column} w={column === "status" ? 24 : undefined}>
                                {HEADERS[column]}
                            </MantineTable.Th>
                        ))}
                    </MantineTable.Tr>
                </MantineTable.Thead>
                <MantineTable.Tbody>
                    {rows.length === 0 && (
                        <MantineTable.Tr>
                            <MantineTable.Td colSpan={shown.length}>
                                <Text size="sm" c="dimmed" ta="center">
                                    {emptyText}
                                </Text>
                            </MantineTable.Td>
                        </MantineTable.Tr>
                    )}
                    {rows.map((subscription) => {
                        const selected = subscription.id === selectedId;
                        return (
                            <SubscriptionListItemProvider key={subscription.id} value={subscription}>
                                <MantineTable.Tr
                                    onClick={select ? () => select(subscription) : undefined}
                                    aria-selected={select ? selected : undefined}
                                    bg={selected ? "var(--mantine-primary-color-light)" : undefined}
                                    style={{ cursor: select ? "pointer" : undefined }}
                                >
                                    {shown.map((column) => (
                                        <Cell
                                            key={column}
                                            column={column}
                                            subscription={subscription}
                                            actions={actions}
                                        />
                                    ))}
                                </MantineTable.Tr>
                            </SubscriptionListItemProvider>
                        );
                    })}
                </MantineTable.Tbody>
            </MantineTable>
            {total > 1 && <Pagination size="sm" total={total} value={current} onChange={setPage} />}
        </Stack>
    );
}
