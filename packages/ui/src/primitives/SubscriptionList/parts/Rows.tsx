import type { ReactNode } from "react";
import { Stack } from "@mantine/core";
import type { SubscriptionRecord } from "../../../utils/subscriptions.types";
import { staleProps } from "../../staleStyle";
import { SubscriptionListItemProvider, useSubscriptionListContext } from "../SubscriptionList.context";
import { Row } from "./Row";
import type { PartProps } from "./types";

export type SubscriptionListRowsProps = PartProps & {
    children?: (subscription: SubscriptionRecord) => ReactNode;
};

export function Rows({ className, style, children }: SubscriptionListRowsProps) {
    const { subscriptions, stale } = useSubscriptionListContext("Rows");
    return (
        <Stack gap="xs" className={className} {...staleProps(stale, style)}>
            {subscriptions.map((subscription) => (
                <SubscriptionListItemProvider key={subscription.id} value={subscription}>
                    {children ? children(subscription) : <Row />}
                </SubscriptionListItemProvider>
            ))}
        </Stack>
    );
}
