import type { CSSProperties } from "react";

export type JsonLdViewerProps = {
    data: object | null | undefined;
    emptyText?: string;
    className?: string;
    style?: CSSProperties;
};
