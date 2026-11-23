import { useMemo, type ReactNode } from "react";
import { useDisclosure } from "@mantine/hooks";
import {
    ConnectionStatusContextProvider,
    ConnectionStatusDetailsProvider,
    type ConnectionStatusContextValue,
} from "./ConnectionStatus.context";

export type ConnectionStatusProviderProps = {
    value: ConnectionStatusContextValue;
    children?: ReactNode;
};

export function ConnectionStatusProvider({ value, children }: ConnectionStatusProviderProps) {
    const [opened, { toggle, close }] = useDisclosure(false);
    const details = useMemo(() => ({ opened, toggle, close }), [opened, toggle, close]);
    return (
        <ConnectionStatusContextProvider value={value}>
            <ConnectionStatusDetailsProvider value={details}>{children}</ConnectionStatusDetailsProvider>
        </ConnectionStatusContextProvider>
    );
}
