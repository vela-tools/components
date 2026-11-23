import { useMemo, useState, type ReactNode } from "react";
import {
    BrokerConfigProvider,
    type BrokerConfigContextValue,
    type BrokerConfigField,
    type BrokerConfigValues,
} from "@vela-tools/ui";
import { NGSI_LD_CORE_CONTEXT } from "../brokers/brokers";
import { useNgsiBrokers } from "../brokers/brokersContext";
import { removeBrokerDisabled, saveBrokerDisabled, type SaveBrokerRejection } from "../brokers/predicates";

export type BrokerConfigRootProps = {
    contextField?: boolean;
    defaultContextUrl?: string;
    children: ReactNode;
};

const NAME_URL_FIELDS: BrokerConfigField[] = [
    { key: "name", label: "Broker name", required: true },
    { key: "url", label: "Broker URL", placeholder: "https://…/ngsi-ld/v1", required: true },
];

const ALL_FIELDS: BrokerConfigField[] = [...NAME_URL_FIELDS, { key: "contextUrl", label: "Context URL" }];

const ACTION_MESSAGES: Record<string, string> = {
    "broker-not-found": "This broker no longer exists.",
    "blank-name": "Give the broker a name.",
    "blank-url": "Give the broker a URL.",
    "name-taken": "A broker with this name already exists.",
    "last-broker": "The last broker can't be removed.",
};

const FIELD_ERRORS: Partial<Record<SaveBrokerRejection, { field: string; message: string }>> = {
    "name-taken": { field: "name", message: "A broker with this name already exists." },
};

const inputOf = (values: BrokerConfigValues) => ({
    name: values.name ?? "",
    url: values.url ?? "",
    contextUrl: values.contextUrl || undefined,
});

export function BrokerConfigRoot({
    contextField = true,
    defaultContextUrl = NGSI_LD_CORE_CONTEXT,
    children,
}: BrokerConfigRootProps) {
    const { brokers, selected, storageFailed, commands } = useNgsiBrokers();
    const [actionError, setActionError] = useState<string | null>(null);

    const value = useMemo<BrokerConfigContextValue>(() => {
        const report = (result: { ok: true } | { ok: false; reason: string }) =>
            setActionError(result.ok ? null : (ACTION_MESSAGES[result.reason] ?? "The broker could not be changed."));
        return {
            brokers,
            selectedId: selected.id,
            select: (id) => report(commands.select(id)),
            fields: contextField ? ALL_FIELDS : NAME_URL_FIELDS,
            valuesOf: (id) => {
                const broker = id === null ? undefined : brokers.find((b) => b.id === id);
                return broker
                    ? { name: broker.name, url: broker.url, contextUrl: broker.contextUrl ?? "" }
                    : { name: "", url: "", contextUrl: defaultContextUrl };
            },
            validate: (values, id) => {
                const reason = saveBrokerDisabled(brokers, inputOf(values), id ?? undefined);
                const error = reason ? FIELD_ERRORS[reason] : undefined;
                return error ? { [error.field]: error.message } : {};
            },
            save: (values, id) => report(commands.save(inputOf(values), id ?? undefined)),
            remove: (id) => report(commands.remove(id)),
            canRemove: (id) => removeBrokerDisabled(brokers, id) === null,
            error: actionError ?? (storageFailed ? "Brokers could not be saved in this browser." : null),
        };
    }, [brokers, selected.id, storageFailed, actionError, commands, contextField, defaultContextUrl]);

    return <BrokerConfigProvider value={value}>{children}</BrokerConfigProvider>;
}
