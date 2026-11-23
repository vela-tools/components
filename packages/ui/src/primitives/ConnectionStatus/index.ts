import { Card, DetailsModal, Indicator, Name, Url } from "./parts";

export const ConnectionStatusCard = {
    Card,
    Indicator,
    Name,
    Url,
    DetailsModal,
};

export type ConnectionStatusParts = typeof ConnectionStatusCard;

export { ConnectionStatusProvider } from "./ConnectionStatusProvider";
export type { ConnectionStatusProviderProps } from "./ConnectionStatusProvider";
export { useConnectionStatusContext } from "./ConnectionStatus.context";
export type { ConnectionStatusContextValue } from "./ConnectionStatus.context";
export type {
    ConnectionStatusCardPartProps,
    ConnectionStatusDetailsModalProps,
    ConnectionStatusIndicatorProps,
    ConnectionStatusPartProps,
} from "./parts";
export type { ConnectionStatus } from "./ConnectionStatus.types";
