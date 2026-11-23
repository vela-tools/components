import { useRef, useSyncExternalStore } from "react";
import { useNgsiContext } from "../runtime/ngsiContext";
import type { SelectionState } from "../runtime/store";

type Cache<T> = { state: SelectionState; selector: (s: SelectionState) => T; value: T };

export function useNgsiSelector<T>(
    selector: (state: SelectionState) => T,
    isEqual: (a: T, b: T) => boolean = Object.is,
): T {
    const { store } = useNgsiContext();
    const cache = useRef<Cache<T> | null>(null);

    const getSnapshot = () => {
        const state = store.getState();
        const c = cache.current;
        if (c && c.state === state && c.selector === selector) return c.value;
        const next = selector(state);
        if (c && isEqual(c.value, next)) {
            cache.current = { state, selector, value: c.value };
            return c.value;
        }
        cache.current = { state, selector, value: next };
        return next;
    };

    return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

const selectAll = (s: SelectionState) => s;

export const useSelection = () => useNgsiSelector(selectAll);
