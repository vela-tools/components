import { Text } from "@mantine/core";
import clsx from "clsx";
import { useConnectionStatusContext } from "../ConnectionStatus.context";
import classes from "./ConnectionStatus.module.css";
import type { PartProps } from "./types";

export function Name({ className, style }: PartProps) {
    const { name } = useConnectionStatusContext("Name");
    return (
        <Text component="span" className={clsx(classes.Name, className)} style={style} truncate="end">
            {name}
        </Text>
    );
}
