import type { ReactNode } from "react";
import { Stack, Text, Title } from "@mantine/core";

type PageProps = {
    title: string;
    description?: ReactNode;
    children: ReactNode;
};

export function Page({ title, description, children }: PageProps) {
    return (
        <Stack>
            <Stack gap={4}>
                <Title order={3}>{title}</Title>
                {description && (
                    <Text size="sm" c="dimmed">
                        {description}
                    </Text>
                )}
            </Stack>
            {children}
        </Stack>
    );
}
