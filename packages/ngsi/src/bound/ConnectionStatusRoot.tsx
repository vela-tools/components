import { useMemo, type ReactNode } from "react";
import { ConnectionStatusProvider, type ConnectionStatusContextValue } from "@vela-tools/ui";
import { useEntityTypes } from "../hooks/useEntityTypes";
import { useNgsi } from "../hooks/useNgsi";
import { connectionStatusOf } from "../runtime/connectionStatus";

export type ConnectionStatusRootProps = {
    details?: ReactNode;
    children: ReactNode;
};

export function ConnectionStatusRoot({ details, children }: ConnectionStatusRootProps) {
    const { broker } = useNgsi();
    const { status, error } = connectionStatusOf(useEntityTypes());

    const value = useMemo<ConnectionStatusContextValue>(
        () => ({ name: broker.name, url: broker.url, status, error, details }),
        [broker.name, broker.url, status, error, details],
    );

    return <ConnectionStatusProvider value={value}>{children}</ConnectionStatusProvider>;
}
