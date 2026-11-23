import type { CSSProperties } from "react";

type StaleProps = {
    "data-stale": true | undefined;
    "aria-busy": true | undefined;
    style: CSSProperties;
};

export function staleProps(stale: boolean, style?: CSSProperties): StaleProps {
    return {
        "data-stale": stale || undefined,
        "aria-busy": stale || undefined,
        style: { opacity: stale ? 0.5 : 1, transition: "opacity 120ms", ...style },
    };
}
