import { useState, type CSSProperties, type ReactNode } from "react";
import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import {
    NotificationList,
    QueryBuilder,
    SubscriptionEditor,
    SubscriptionList,
    subscriptionTitle,
} from "@vela-tools/ui";
import { NotificationListRoot } from "../bound/NotificationListRoot";
import { SubscriptionEditorRoot } from "../bound/SubscriptionEditorRoot";
import { SubscriptionListRoot } from "../bound/SubscriptionListRoot";
import { useCapabilities } from "../hooks/useNgsi";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { If } from "../runtime/If";
import type { Subscription, SubscriptionDraft } from "../types";

export type SubscriptionManagerProps = {
    onCreated?: (subscription: Subscription) => void;
    onUpdated?: (subscription: Subscription) => void;
    defaultValues?: Partial<SubscriptionDraft>;
    notificationLimit?: number;
    fallback?: ReactNode;
    className?: string;
    style?: CSSProperties;
};

export function SubscriptionManager({ fallback = null, ...props }: SubscriptionManagerProps) {
    return (
        <If capability="subscriptions" fallback={fallback}>
            <SubscriptionManagerView {...props} />
        </If>
    );
}

function SubscriptionManagerView({
    onCreated,
    onUpdated,
    defaultValues,
    notificationLimit,
    className,
    style,
}: Omit<SubscriptionManagerProps, "fallback">) {
    const { notifications } = useCapabilities();
    const subscriptions = useSubscriptions().data;
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editor, setEditor] = useState<{ key: string; subscription?: Subscription } | null>(null);

    const selected = subscriptions?.find((s) => s.id === selectedId) ?? null;
    const closeEditor = () => setEditor(null);
    const openNew = () => setEditor({ key: "new" });

    return (
        <Stack gap="md" className={className} style={style}>
            <Group justify="space-between">
                <Text fw={600}>Subscriptions</Text>
                {editor === null && (
                    <Button size="xs" variant="light" onClick={openNew}>
                        New subscription
                    </Button>
                )}
            </Group>

            {editor !== null && (
                <Paper withBorder p="sm">
                    <SubscriptionEditorRoot
                        key={editor.key}
                        defaultValues={defaultValues}
                        subscription={editor.subscription}
                        onCreated={(subscription) => {
                            closeEditor();
                            onCreated?.(subscription);
                        }}
                        onUpdated={(subscription) => {
                            closeEditor();
                            onUpdated?.(subscription);
                        }}
                        onCancel={closeEditor}
                    >
                        <SubscriptionEditor.Form>
                            <Stack gap="sm">
                                <SubscriptionEditor.Name />
                                <SubscriptionEditor.Description />
                                <SubscriptionEditor.Endpoint />
                                <QueryBuilder.EntityTypes />
                                <QueryBuilder.Conditions>
                                    <QueryBuilder.Preview />
                                </QueryBuilder.Conditions>
                                <QueryBuilder.GeoRegion />
                                <SubscriptionEditor.NotifyWhen />
                                <SubscriptionEditor.WatchedAttributes />
                                <SubscriptionEditor.ExpiresAt />
                                <SubscriptionEditor.Format />
                                <SubscriptionEditor.Payload />
                                <SubscriptionEditor.Error />
                                <SubscriptionEditor.Actions />
                            </Stack>
                        </SubscriptionEditor.Form>
                    </SubscriptionEditorRoot>
                </Paper>
            )}

            <SubscriptionListRoot
                selectedId={selectedId}
                onSelect={setSelectedId}
                onEdit={(subscription) => setEditor({ key: subscription.id, subscription })}
            >
                <SubscriptionList.Error />
                <SubscriptionList.Table />
            </SubscriptionListRoot>

            {notifications && (
                <NotificationListRoot subscriptionId={selected?.id} limit={notificationLimit}>
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text fw={600}>
                                {selected ? `Notifications: ${subscriptionTitle(selected)}` : "Notifications"}
                            </Text>
                            {selected && (
                                <Button size="compact-xs" variant="subtle" onClick={() => setSelectedId(null)}>
                                    Show all
                                </Button>
                            )}
                        </Group>
                        <NotificationList.Error />
                        <NotificationList.Table />
                    </Stack>
                </NotificationListRoot>
            )}
        </Stack>
    );
}
