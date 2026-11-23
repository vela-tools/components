import { Text } from "@mantine/core";
import clsx from "clsx";
import { useConnectionStatusContext } from "../ConnectionStatus.context";
import classes from "./ConnectionStatus.module.css";
import type { PartProps } from "./types";

export function Url({ className, style }: PartProps) {
    const { url } = useConnectionStatusContext("Url");
    if (!url) return null;
    return (
        <Text component="span" className={clsx(classes.Url, className)} style={style} truncate="end">
            {url}
        </Text>
    );
}
