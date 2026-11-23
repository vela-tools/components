import type { ReactNode } from "react";
import type { ConnectionStatus } from "./ConnectionStatus.types";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type ConnectionStatusContextValue = {
    name: string;
    url?: string;
    status: ConnectionStatus;
    error?: string;
    details?: ReactNode;
};

type ConnectionStatusDetailsValue = {
    opened: boolean;
    toggle: () => void;
    close: () => void;
};

export const [ConnectionStatusContextProvider, useConnectionStatusContext] =
    createPrimitiveContext<ConnectionStatusContextValue>("ConnectionStatus");

export const [ConnectionStatusDetailsProvider, useConnectionStatusDetails] =
    createPrimitiveContext<ConnectionStatusDetailsValue>("ConnectionStatus");
