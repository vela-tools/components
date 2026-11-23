import { useMemo, useState, type ReactNode } from "react";
import {
    BrokerConfigContextProvider,
    BrokerConfigEditingProvider,
    type BrokerConfigContextValue,
    type BrokerConfigEditingValue,
} from "./BrokerConfig.context";

export type BrokerConfigProviderProps = {
    value: BrokerConfigContextValue;
    children?: ReactNode;
};

export function BrokerConfigProvider({ value, children }: BrokerConfigProviderProps) {
    const [editing, setEditing] = useState<BrokerConfigEditingValue["editing"]>(null);
    const editingValue = useMemo<BrokerConfigEditingValue>(
        () => ({ editing, edit: (id) => setEditing({ id }), close: () => setEditing(null) }),
        [editing],
    );
    return (
        <BrokerConfigContextProvider value={value}>
            <BrokerConfigEditingProvider value={editingValue}>{children}</BrokerConfigEditingProvider>
        </BrokerConfigContextProvider>
    );
}
