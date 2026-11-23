import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NgsiAdapters } from "../adapters";
import { capabilitiesOf } from "./capabilities";
import { createCommands } from "./commands";
import { NgsiContext, type NgsiContextValue } from "./ngsiContext";
import { createSelectionStore, type SelectionStore } from "./store";

export type BrokerInfo = {
    id: string;
    name: string;
    url?: string;
};

export type NgsiProviderProps = {
    broker: BrokerInfo;
    adapters: NgsiAdapters;
    children: ReactNode;
};

export function NgsiProvider({ broker, adapters, children }: NgsiProviderProps) {
    const queryClient = useQueryClient();
    const { id: brokerId, name: brokerName, url: brokerUrl } = broker;

    const [stored, setStored] = useState(() => ({ brokerId, store: createSelectionStore() }));
    let store: SelectionStore = stored.store;
    if (stored.brokerId !== brokerId) {
        const next = { brokerId, store: createSelectionStore() };
        setStored(next);
        store = next.store;
    }

    const value = useMemo<NgsiContextValue>(
        () => ({
            broker: { id: brokerId, name: brokerName, url: brokerUrl },
            adapters,
            capabilities: capabilitiesOf(adapters),
            store,
            commands: createCommands(store, queryClient, brokerId, adapters),
        }),
        [brokerId, brokerName, brokerUrl, adapters, store, queryClient],
    );

    return <NgsiContext.Provider value={value}>{children}</NgsiContext.Provider>;
}
