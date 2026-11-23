import type { ReactNode } from "react";
import { Badge } from "@mantine/core";
import { useEntityDetailsContext } from "../EntityDetails.context";
import type { PartProps } from "./types";

export type EntityDetailsHeaderProps = PartProps & { emptyText?: ReactNode };

export function Header({ emptyText = "No entity selected", className, style }: EntityDetailsHeaderProps) {
    const { entity } = useEntityDetailsContext("Header");
    return (
        <Badge
            variant="light"
            className={className}
            style={{ textTransform: "none", fontFamily: "var(--mantine-font-family-monospace)", ...style }}
        >
            {entity ? (
                <>
                    <strong>{entity.type}</strong> - {entity.id}
                </>
            ) : (
                emptyText
            )}
        </Badge>
    );
}
