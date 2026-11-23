import clsx from "clsx";
import { Text } from "@mantine/core";
import { useQueryBuilderContext } from "../QueryBuilder.context";
import classes from "./QueryBuilder.module.css";
import type { PartProps } from "./types";

export function Error({ className, style }: PartProps) {
    const { error } = useQueryBuilderContext("Error");
    if (!error) return null;
    return (
        <Text role="alert" className={clsx(classes.error, className)} style={style}>
            {error}
        </Text>
    );
}
