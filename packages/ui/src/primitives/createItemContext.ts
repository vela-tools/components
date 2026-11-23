import { createContext, useContext } from "react";

export function createItemContext<T>(familyName: string, containers: string) {
    const Context = createContext<T | null>(null);
    Context.displayName = `${familyName}ItemContext`;

    function useItemContext(partName: string): T {
        const value = useContext(Context);
        if (value === null) {
            throw new Error(`<${familyName}.${partName}> must be used inside ${containers}.`);
        }
        return value;
    }

    return [Context.Provider, useItemContext] as const;
}
