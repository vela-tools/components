import type { EntityQuery, EntityTypeRef } from "../types";

export type SelectionState = {
    types: EntityTypeRef[];
    entityId: string | null;
    attribute: string | null;
    query: EntityQuery;
};

const initialSelection: SelectionState = {
    types: [],
    entityId: null,
    attribute: null,
    query: {},
};

export type SelectionStore = {
    getState(): SelectionState;
    setState(update: (state: SelectionState) => SelectionState): void;
    subscribe(listener: () => void): () => void;
};

export function createSelectionStore(initial: SelectionState = initialSelection): SelectionStore {
    let state = initial;
    const listeners = new Set<() => void>();

    return {
        getState: () => state,
        setState(update) {
            const next = update(state);
            if (next === state) return;
            state = next;
            listeners.forEach((listener) => listener());
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}
