import { Group, NumberInput, Select, Stack, TagsInput, TextInput } from "@mantine/core";
import type { SubscriptionEditorPayload } from "../../../utils/subscriptions.types";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

const JOINS = [
    { value: "", label: "No linked entities" },
    { value: "flat", label: "Flat" },
    { value: "inline", label: "Inline" },
];

const joinOf = (value: string | null): SubscriptionEditorPayload["join"] =>
    value === "flat" || value === "inline" ? value : "";

export function Advanced({ className, style }: PartProps) {
    const { values, setField, availableAttributes, invalid, editing } = useSubscriptionEditorContext("Advanced");
    const payload = values.payload;
    const set = (patch: Partial<SubscriptionEditorPayload>) => setField("payload", { ...payload, ...patch });
    return (
        <FieldLock fields={["payload", "jsonldContext", "expandValues", "jsonKeys"]}>
            <Stack gap="xs" className={className} style={style}>
                <Group grow align="flex-start">
                    <Select
                        label="Linked entities"
                        description="This broker rejects subscriptions that join linked entities."
                        size="xs"
                        data={JOINS}
                        value={payload.join}
                        allowDeselect={false}
                        disabled
                        onChange={(value) => {
                            const join = joinOf(value);
                            set({ join, ...(join ? {} : { joinLevel: undefined }) });
                        }}
                    />
                    <NumberInput
                        label="Link depth"
                        description="Default 1."
                        size="xs"
                        min={1}
                        allowDecimal={false}
                        disabled
                        value={payload.joinLevel ?? ""}
                        error={invalid.has("payload") && payload.joinLevel !== undefined}
                        onChange={(value) => set({ joinLevel: typeof value === "number" ? value : undefined })}
                    />
                </Group>
                <TextInput
                    label="@context for notifications"
                    description={
                        editing
                            ? "Stored by the broker as its own copy; can't be changed."
                            : "Empty: the broker's default."
                    }
                    placeholder="https://example.org/context.jsonld"
                    size="xs"
                    value={values.jsonldContext}
                    readOnly={editing}
                    error={invalid.has("jsonldContext")}
                    onChange={(event) => setField("jsonldContext", event.currentTarget.value)}
                />
                <Group grow align="flex-start">
                    <TagsInput
                        label="Expand values"
                        description="Attributes whose string values are expanded to URIs."
                        size="xs"
                        clearable
                        data={availableAttributes}
                        value={values.expandValues}
                        error={invalid.has("expandValues")}
                        onChange={(expandValues) => setField("expandValues", expandValues)}
                    />
                    <TagsInput
                        label="JSON keys"
                        description="Attributes sent as JsonProperty."
                        size="xs"
                        clearable
                        data={availableAttributes}
                        value={values.jsonKeys}
                        error={invalid.has("jsonKeys")}
                        onChange={(jsonKeys) => setField("jsonKeys", jsonKeys)}
                    />
                </Group>
            </Stack>
        </FieldLock>
    );
}
