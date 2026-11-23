import { createContext, useContext } from "react";
import type { NgsiAdapters } from "../adapters";
import type { Capabilities } from "./capabilities";
import type { NgsiCommands } from "./commands";
import type { BrokerInfo } from "./NgsiProvider";
import type { SelectionStore } from "./store";

export type NgsiContextValue = {
    broker: BrokerInfo;
    adapters: NgsiAdapters;
    capabilities: Capabilities;
    store: SelectionStore;
    commands: NgsiCommands;
};

export const NgsiContext = createContext<NgsiContextValue | null>(null);

export function useNgsiContext(): NgsiContextValue {
    const ctx = useContext(NgsiContext);
    if (!ctx) throw new Error("Ngsi hooks must be used inside <NgsiProvider>.");
    return ctx;
}
