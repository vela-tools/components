import clsx from "clsx";
import { Text } from "@mantine/core";
import { useQueryBuilderContext } from "../QueryBuilder.context";
import classes from "./QueryBuilder.module.css";
import type { PartProps } from "./types";

export function Preview({ className, style }: PartProps) {
    const { draft, preview } = useQueryBuilderContext("Preview");
    if (draft.mode !== "builder" || !preview) return null;
    return (
        <Text className={clsx(classes.preview, className)} style={style}>
            {preview}
        </Text>
    );
}
