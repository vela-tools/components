import type { ReactNode } from "react";
import { Tooltip, UnstyledButton } from "@mantine/core";
import clsx from "clsx";
import { useConnectionStatusContext, useConnectionStatusDetails } from "../ConnectionStatus.context";
import classes from "./ConnectionStatus.module.css";
import { Indicator } from "./Indicator";
import { Name } from "./Name";
import { Url } from "./Url";
import type { PartProps } from "./types";

export type ConnectionStatusCardPartProps = PartProps & { children?: ReactNode };

function DefaultContent() {
    return (
        <>
            <Indicator />
            <Name />
            <Url />
        </>
    );
}

export function Card({ className, style, children }: ConnectionStatusCardPartProps) {
    const { status, error, details } = useConnectionStatusContext("Card");
    const { toggle } = useConnectionStatusDetails("Card");

    const content = <div className={classes.Content}>{children ?? <DefaultContent />}</div>;

    const card =
        details === undefined ? (
            <div className={clsx(classes.ConnectionStatusCard, className)} style={style} data-status={status}>
                {content}
            </div>
        ) : (
            <UnstyledButton
                className={clsx(classes.ConnectionStatusCard, classes.Clickable, className)}
                style={style}
                data-status={status}
                onClick={toggle}
                aria-haspopup="dialog"
            >
                {content}
            </UnstyledButton>
        );

    return (
        <Tooltip label={error} disabled={!error} multiline maw={320} withinPortal>
            {card}
        </Tooltip>
    );
}
