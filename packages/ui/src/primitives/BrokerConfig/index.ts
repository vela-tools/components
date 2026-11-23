import { Error, Form, List, NewButton } from "./parts";

export const BrokerConfig = {
    List,
    NewButton,
    Form,
    Error,
};

export type BrokerConfigParts = typeof BrokerConfig;

export { BrokerConfigProvider } from "./BrokerConfigProvider";
export type { BrokerConfigProviderProps } from "./BrokerConfigProvider";
export { useBrokerConfigContext } from "./BrokerConfig.context";
export type {
    BrokerConfigContextValue,
    BrokerConfigErrors,
    BrokerConfigField,
    BrokerConfigItem,
    BrokerConfigValues,
} from "./BrokerConfig.context";
export type { BrokerConfigFormProps, BrokerConfigNewButtonProps, BrokerConfigPartProps } from "./parts";
