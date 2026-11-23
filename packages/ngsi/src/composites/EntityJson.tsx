import type { CSSProperties } from "react";
import { Stack } from "@mantine/core";
import { JsonLdViewer } from "@vela-tools/ui";
import { useEntity } from "../hooks/useEntity";
import { useNgsiSelector } from "../hooks/useNgsiSelector";
import { QueryError } from "./QueryError";

export type EntityJsonProps = {
    entityId?: string;
    emptyText?: string;
    className?: string;
    style?: CSSProperties;
};

export function EntityJson({ entityId: pinnedId, emptyText, className, style }: EntityJsonProps) {
    const sharedEntityId = useNgsiSelector((s) => s.entityId);
    const entity = useEntity(pinnedId ?? sharedEntityId);
    return (
        <Stack gap={0} className={className} style={style}>
            <QueryError error={entity.error} />
            <JsonLdViewer data={entity.data ?? null} emptyText={emptyText} />
        </Stack>
    );
}
