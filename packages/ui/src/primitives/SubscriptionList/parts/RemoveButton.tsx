import { useState } from "react";
import { Button, Group, Popover, Stack, Text } from "@mantine/core";
import { subscriptionTitle } from "../../../utils/subscriptions";
import { useSubscriptionListContext, useSubscriptionListItem } from "../SubscriptionList.context";
import type { PartProps } from "./types";

export function RemoveButton({ className, style }: PartProps) {
    const { remove, pendingIds } = useSubscriptionListContext("RemoveButton");
    const subscription = useSubscriptionListItem("RemoveButton");
    const [opened, setOpened] = useState(false);
    if (!remove) return null;
    const pending = pendingIds.includes(subscription.id);

    return (
        <Popover
            opened={opened && !pending}
            onClose={() => setOpened(false)}
            width={240}
            position="bottom-end"
            withArrow
            withinPortal
        >
            <Popover.Target>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    disabled={pending}
                    className={className}
                    style={style}
                    onClick={(event) => {
                        event.stopPropagation();
                        setOpened((open) => !open);
                    }}
                >
                    Remove
                </Button>
            </Popover.Target>
            <Popover.Dropdown onClick={(event) => event.stopPropagation()}>
                <Stack gap="xs">
                    <Text size="xs">
                        Remove <b>{subscriptionTitle(subscription)}</b>? The broker stops notifying, and this can't be
                        undone.
                    </Text>
                    <Group gap="xs" justify="flex-end">
                        <Button size="compact-xs" variant="default" onClick={() => setOpened(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="compact-xs"
                            color="red"
                            onClick={() => {
                                setOpened(false);
                                remove(subscription);
                            }}
                        >
                            Remove subscription
                        </Button>
                    </Group>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}
