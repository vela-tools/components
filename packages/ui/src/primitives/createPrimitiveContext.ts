import { createContext, useContext } from "react";

export function createPrimitiveContext<T>(familyName: string) {
    const Context = createContext<T | null>(null);
    Context.displayName = `${familyName}Context`;

    function useFamilyContext(partName: string): T {
        const value = useContext(Context);
        if (value === null) {
            throw new Error(`<${familyName}.${partName}> must be used inside a ${familyName} Root.`);
        }
        return value;
    }

    return [Context.Provider, useFamilyContext] as const;
}
