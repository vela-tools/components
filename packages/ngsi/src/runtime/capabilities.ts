import type { NgsiAdapters } from "../adapters";

export type Capabilities = {
    subscriptions: boolean;
    notifications: boolean;
    temporal: boolean;
    live: boolean;
    savedQueries: boolean;
};

export function capabilitiesOf(adapters: NgsiAdapters): Capabilities {
    return {
        subscriptions: adapters.subscriptions !== undefined,
        notifications: adapters.notifications !== undefined,
        temporal: adapters.temporal !== undefined,
        live: adapters.live !== undefined,
        savedQueries: adapters.savedQueries !== undefined,
    };
}
