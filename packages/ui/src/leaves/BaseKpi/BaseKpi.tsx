import type { ReactNode } from "react";
import { Card, Stack } from "@mantine/core";
import classes from "./BaseKpi.module.css";
import clsx from "clsx";

export interface BaseKpiProps {
    children: ReactNode;
    className?: string;
}

export function BaseKpi({ children, className }: BaseKpiProps) {
    return (
        <Card className={clsx(classes.BaseKpi, className)}>
            <Card.Section>
                <Stack className={classes.BaseKpiContent} gap={0}>
                    {children}
                </Stack>
            </Card.Section>
        </Card>
    );
}
