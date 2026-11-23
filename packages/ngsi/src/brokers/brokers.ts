export type NgsiBroker = {
    id: string;
    name: string;
    url: string;
    contextUrl?: string;
};

export type NgsiBrokerInput = Omit<NgsiBroker, "id"> & { id?: string };

export type NgsiBrokerState = {
    brokers: NgsiBroker[];
    selectedId: string;
};

export const NGSI_LD_CORE_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld";

export const brokerSourceId = (broker: Pick<NgsiBroker, "url" | "contextUrl">) =>
    `${broker.url}|${broker.contextUrl ?? ""}`;

export function newBrokerId() {
    return `broker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cleanBroker(input: NgsiBrokerInput, id: string): NgsiBroker {
    const contextUrl = input.contextUrl?.trim();
    return { id, name: input.name.trim(), url: input.url.trim(), ...(contextUrl ? { contextUrl } : {}) };
}

export function initialBrokerState(defaults: readonly NgsiBrokerInput[]): NgsiBrokerState {
    const brokers = defaults.map((input, index) => cleanBroker(input, input.id ?? `default-${index}`));
    if (brokers.length === 0) throw new Error("NgsiBrokersProvider needs at least one default broker.");
    return { brokers, selectedId: brokers[0].id };
}
