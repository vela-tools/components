import { useMemo, useRef, useState, type ReactNode } from "react";
import type { NgsiAdapters } from "../adapters";
import { NgsiProvider } from "../runtime/NgsiProvider";
import { loadBrokerState, saveBrokerState } from "./brokerStorage";
import {
    brokerSourceId,
    cleanBroker,
    initialBrokerState,
    newBrokerId,
    type NgsiBroker,
    type NgsiBrokerInput,
    type NgsiBrokerState,
} from "./brokers";
import { NgsiBrokersContext, type NgsiBrokerCommands, type NgsiBrokersValue } from "./brokersContext";
import { removeBrokerDisabled, saveBrokerDisabled, selectBrokerDisabled } from "./predicates";

export type NgsiBrokersProviderProps = {
    defaultBrokers: readonly NgsiBrokerInput[];
    storageKey?: string;
    createAdapters: (broker: NgsiBroker) => NgsiAdapters;
    children: ReactNode;
};

export function NgsiBrokersProvider({
    defaultBrokers,
    storageKey,
    createAdapters,
    children,
}: NgsiBrokersProviderProps) {
    const [state, setState] = useState<NgsiBrokerState>(
        () => (storageKey ? loadBrokerState(storageKey) : null) ?? initialBrokerState(defaultBrokers),
    );
    const [storageFailed, setStorageFailed] = useState(false);
    const stateRef = useRef(state);

    const commands = useMemo<NgsiBrokerCommands>(() => {
        const commit = (next: NgsiBrokerState) => {
            stateRef.current = next;
            setState(next);
            if (storageKey) setStorageFailed(!saveBrokerState(storageKey, next));
        };

        return {
            select(id) {
                const current = stateRef.current;
                const reason = selectBrokerDisabled(current.brokers, id);
                if (reason) return { ok: false, reason };
                if (current.selectedId !== id) commit({ ...current, selectedId: id });
                return { ok: true };
            },
            save(input, id) {
                const current = stateRef.current;
                const reason = saveBrokerDisabled(current.brokers, input, id);
                if (reason) return { ok: false, reason };
                const broker = cleanBroker(input, id ?? input.id ?? newBrokerId());
                const brokers =
                    id === undefined
                        ? [...current.brokers, broker]
                        : current.brokers.map((b) => (b.id === id ? broker : b));
                commit({ ...current, brokers });
                return { ok: true, broker };
            },
            remove(id) {
                const current = stateRef.current;
                const reason = removeBrokerDisabled(current.brokers, id);
                if (reason) return { ok: false, reason };
                const brokers = current.brokers.filter((b) => b.id !== id);
                const selectedId = current.selectedId === id ? brokers[0].id : current.selectedId;
                commit({ brokers, selectedId });
                return { ok: true };
            },
        };
    }, [storageKey]);

    const selected = state.brokers.find((b) => b.id === state.selectedId) ?? state.brokers[0];
    const adapters = useMemo(() => createAdapters(selected), [createAdapters, selected]);
    const broker = useMemo(
        () => ({ id: brokerSourceId(selected), name: selected.name, url: selected.url }),
        [selected],
    );

    const value = useMemo<NgsiBrokersValue>(
        () => ({ brokers: state.brokers, selected, storageFailed, commands }),
        [state.brokers, selected, storageFailed, commands],
    );

    return (
        <NgsiBrokersContext.Provider value={value}>
            <NgsiProvider broker={broker} adapters={adapters}>
                {children}
            </NgsiProvider>
        </NgsiBrokersContext.Provider>
    );
}
