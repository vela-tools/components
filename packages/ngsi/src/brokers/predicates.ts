import type { NgsiBroker, NgsiBrokerInput } from "./brokers";

export type SelectBrokerRejection = "broker-not-found";

export type SaveBrokerRejection = "broker-not-found" | "blank-name" | "blank-url" | "name-taken";

export type RemoveBrokerRejection = "broker-not-found" | "last-broker";

const isBlank = (value: string | undefined) => !value || value.trim() === "";

export function selectBrokerDisabled(brokers: readonly NgsiBroker[], id: string): SelectBrokerRejection | null {
    return brokers.some((b) => b.id === id) ? null : "broker-not-found";
}

export function saveBrokerDisabled(
    brokers: readonly NgsiBroker[],
    input: Pick<NgsiBrokerInput, "name" | "url">,
    id?: string,
): SaveBrokerRejection | null {
    if (id !== undefined && !brokers.some((b) => b.id === id)) return "broker-not-found";
    if (isBlank(input.name)) return "blank-name";
    if (isBlank(input.url)) return "blank-url";
    const name = input.name.trim();
    if (brokers.some((b) => b.id !== id && b.name === name)) return "name-taken";
    return null;
}

export function removeBrokerDisabled(brokers: readonly NgsiBroker[], id: string): RemoveBrokerRejection | null {
    if (!brokers.some((b) => b.id === id)) return "broker-not-found";
    if (brokers.length <= 1) return "last-broker";
    return null;
}
