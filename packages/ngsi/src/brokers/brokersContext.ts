import { createContext, useContext } from "react";
import type { CommandResult } from "../runtime/commands";
import type { NgsiBroker, NgsiBrokerInput } from "./brokers";
import type { RemoveBrokerRejection, SaveBrokerRejection, SelectBrokerRejection } from "./predicates";

export type NgsiBrokerCommands = {
    select(id: string): CommandResult<SelectBrokerRejection>;
    save(
        input: NgsiBrokerInput,
        id?: string,
    ): { ok: true; broker: NgsiBroker } | { ok: false; reason: SaveBrokerRejection };
    remove(id: string): CommandResult<RemoveBrokerRejection>;
};

export type NgsiBrokersValue = {
    brokers: readonly NgsiBroker[];
    selected: NgsiBroker;
    storageFailed: boolean;
    commands: NgsiBrokerCommands;
};

export const NgsiBrokersContext = createContext<NgsiBrokersValue | null>(null);

export function useNgsiBrokers(): NgsiBrokersValue {
    const value = useContext(NgsiBrokersContext);
    if (!value) throw new Error("useNgsiBrokers must be used inside <NgsiBrokersProvider>.");
    return value;
}
