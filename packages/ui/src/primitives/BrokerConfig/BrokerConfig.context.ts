import type { ReactNode } from "react";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type BrokerConfigItem = {
    id: string;
    name: string;
    url: string;
};

export type BrokerConfigField = {
    key: string;
    label: ReactNode;
    placeholder?: string;
    required?: boolean;
};

export type BrokerConfigValues = Record<string, string>;

export type BrokerConfigErrors = Partial<Record<string, ReactNode>>;

export type BrokerConfigContextValue = {
    brokers: readonly BrokerConfigItem[];
    selectedId: string | null;
    select: (id: string) => void;
    fields: readonly BrokerConfigField[];
    valuesOf: (id: string | null) => BrokerConfigValues;
    validate?: (values: BrokerConfigValues, id: string | null) => BrokerConfigErrors;
    save: (values: BrokerConfigValues, id: string | null) => void;
    remove?: (id: string) => void;
    canRemove?: (id: string) => boolean;
    error?: ReactNode;
};

export type BrokerConfigEditingValue = {
    editing: { id: string | null } | null;
    edit: (id: string | null) => void;
    close: () => void;
};

export const [BrokerConfigContextProvider, useBrokerConfigContext] =
    createPrimitiveContext<BrokerConfigContextValue>("BrokerConfig");

export const [BrokerConfigEditingProvider, useBrokerConfigEditing] =
    createPrimitiveContext<BrokerConfigEditingValue>("BrokerConfig");
