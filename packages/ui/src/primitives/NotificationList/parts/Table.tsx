import { useState } from "react";
import { Pagination, Stack, Table as MantineTable, Text } from "@mantine/core";
import type { NotificationRecord } from "../../../utils/subscriptions.types";
import { formatPayload, formatTime, pageCount, pageItems, shortEntityId } from "../../../utils/subscriptions";
import { staleProps } from "../../staleStyle";
import { NotificationListItemProvider, useNotificationListContext } from "../NotificationList.context";
import { Status } from "./Status";
import { subscriptionLabel } from "./subscriptionLabel";
import type { PartProps } from "./types";

export type NotificationListColumn = "time" | "subscription" | "source" | "payload" | "status";

export type NotificationListTableProps = PartProps & {
    columns?: NotificationListColumn[];
    pageSize?: number;
};

const ALL_COLUMNS: NotificationListColumn[] = ["time", "subscription", "source", "payload", "status"];

const HEADERS: Record<NotificationListColumn, string> = {
    time: "Time",
    subscription: "Subscription",
    source: "Source",
    payload: "Payload",
    status: "Status",
};

function Cell({
    column,
    notification,
    names,
}: {
    column: NotificationListColumn;
    notification: NotificationRecord;
    names?: Record<string, string>;
}) {
    switch (column) {
        case "time":
            return (
                <MantineTable.Td style={{ whiteSpace: "nowrap" }}>
                    {formatTime(notification.receivedAt)}
                </MantineTable.Td>
            );
        case "subscription":
            return <MantineTable.Td>{subscriptionLabel(notification, names)}</MantineTable.Td>;
        case "source":
            return <MantineTable.Td>{shortEntityId(notification.source)}</MantineTable.Td>;
        case "payload":
            return <MantineTable.Td ff="monospace">{formatPayload(notification.payload)}</MantineTable.Td>;
        case "status":
            return (
                <MantineTable.Td>
                    <Status />
                </MantineTable.Td>
            );
    }
}

export function Table({ columns = ALL_COLUMNS, pageSize = 20, className, style }: NotificationListTableProps) {
    const {
        notifications,
        subscriptionNames,
        stale,
        emptyText = "No notifications",
    } = useNotificationListContext("Table");
    const [page, setPage] = useState(1);
    const total = pageCount(notifications.length, pageSize);
    const current = Math.min(page, total);
    const rows = pageItems(notifications, current, pageSize);

    return (
        <Stack gap="xs" className={className} style={style}>
            <MantineTable {...staleProps(stale)}>
                <MantineTable.Thead>
                    <MantineTable.Tr>
                        {columns.map((column) => (
                            <MantineTable.Th key={column}>{HEADERS[column]}</MantineTable.Th>
                        ))}
                    </MantineTable.Tr>
                </MantineTable.Thead>
                <MantineTable.Tbody>
                    {rows.length === 0 && (
                        <MantineTable.Tr>
                            <MantineTable.Td colSpan={columns.length}>
                                <Text size="sm" c="dimmed" ta="center">
                                    {emptyText}
                                </Text>
                            </MantineTable.Td>
                        </MantineTable.Tr>
                    )}
                    {rows.map((notification) => (
                        <NotificationListItemProvider key={notification.id} value={notification}>
                            <MantineTable.Tr>
                                {columns.map((column) => (
                                    <Cell
                                        key={column}
                                        column={column}
                                        notification={notification}
                                        names={subscriptionNames}
                                    />
                                ))}
                            </MantineTable.Tr>
                        </NotificationListItemProvider>
                    ))}
                </MantineTable.Tbody>
            </MantineTable>
            {total > 1 && <Pagination size="sm" total={total} value={current} onChange={setPage} />}
        </Stack>
    );
}
