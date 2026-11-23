import type { ReactNode } from "react";
import { Text } from "@mantine/core";
import clsx from "clsx";
import type { ConnectionStatus } from "../ConnectionStatus.types";
import { useConnectionStatusContext } from "../ConnectionStatus.context";
import classes from "./ConnectionStatus.module.css";
import type { PartProps } from "./types";

export type ConnectionStatusIndicatorProps = PartProps & { label?: ReactNode };

const LABEL: Record<ConnectionStatus, string> = {
    connecting: "connecting…",
    connected: "connected",
    error: "unreachable",
};

const DOT: Record<ConnectionStatus, string> = {
    connecting: clsx(classes.DotConnecting, "vela-pulse-dot"),
    connected: clsx(classes.DotConnected, "vela-pulse-dot"),
    error: classes.DotError,
};

export function Indicator({ label = "Broker", className, style }: ConnectionStatusIndicatorProps) {
    const { status } = useConnectionStatusContext("Indicator");
    return (
        <Text component="span" role="status" className={clsx(classes.StatusLine, className)} style={style}>
            <span className={clsx(classes.Dot, DOT[status])} aria-hidden />
            {label} · {LABEL[status]}
        </Text>
    );
}
