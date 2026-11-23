import type { ReactNode } from "react";
import { Stack, Text } from "@mantine/core";

const FIELDSET = { border: 0, padding: 0, margin: 0, minWidth: 0, pointerEvents: "none", opacity: 0.7 } as const;

export function Locked({ reason, children }: { reason?: string; children: ReactNode }) {
    if (!reason) return children;
    return (
        <Stack gap={4}>
            <fieldset disabled style={FIELDSET}>
                {children}
            </fieldset>
            <Text size="xs" c="orange">
                {reason}
            </Text>
        </Stack>
    );
}
