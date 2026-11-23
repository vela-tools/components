import type { CSSProperties, ReactNode } from "react";
import { Stack, Text } from "@mantine/core";
import { BrokerConfig } from "@vela-tools/ui";
import { BrokerConfigRoot } from "../bound/BrokerConfigRoot";
import { BrokerStatus } from "./BrokerStatus";

export type BrokerConnectorProps = {
    title?: ReactNode;
    contextField?: boolean;
    className?: string;
    style?: CSSProperties;
};

export function BrokerConnector({ title = "NGSI-LD brokers", contextField, className, style }: BrokerConnectorProps) {
    return (
        <BrokerStatus
            className={className}
            style={style}
            details={
                <BrokerConfigRoot contextField={contextField}>
                    <Stack gap="sm">
                        <Text size="sm" fw={500}>
                            {title}
                        </Text>
                        <BrokerConfig.List />
                        <BrokerConfig.NewButton />
                        <BrokerConfig.Form />
                        <BrokerConfig.Error />
                    </Stack>
                </BrokerConfigRoot>
            }
        />
    );
}
