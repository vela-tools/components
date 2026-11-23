import { Checkbox, Group, Stack, TagsInput } from "@mantine/core";
import type { SubscriptionEditorPayload } from "../../../utils/subscriptions.types";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function Payload({ className, style }: PartProps) {
    const { values, setField, availableAttributes, invalid } = useSubscriptionEditorContext("Payload");
    const payload = values.payload;
    const error = invalid.has("payload");
    const set = (patch: Partial<SubscriptionEditorPayload>) => setField("payload", { ...payload, ...patch });
    const keyValues = payload.format === "keyValues";
    return (
        <FieldLock fields={["payload"]}>
            <Stack gap="xs" className={className} style={style}>
                <Group grow align="flex-start">
                    <TagsInput
                        label="Only these attributes"
                        description="Empty: every attribute."
                        size="xs"
                        clearable
                        data={availableAttributes}
                        value={payload.pick}
                        error={error && payload.pick.some((name) => !name.trim())}
                        onChange={(pick) => set({ pick })}
                    />
                    <TagsInput
                        label="Leave out"
                        description="Attributes removed from each entity."
                        size="xs"
                        clearable
                        data={availableAttributes}
                        value={payload.omit}
                        error={error && payload.omit.some((name) => !name.trim())}
                        onChange={(omit) => set({ omit })}
                    />
                </Group>
                <Group gap="md">
                    <Checkbox
                        size="xs"
                        label="Include previous values"
                        description={keyValues ? "Not available in the key-values format." : undefined}
                        disabled={keyValues}
                        checked={payload.showChanges}
                        error={error && keyValues && payload.showChanges}
                        onChange={(event) => set({ showChanges: event.currentTarget.checked })}
                    />
                    <Checkbox
                        size="xs"
                        label="Include system attributes"
                        description="createdAt, modifiedAt"
                        checked={payload.sysAttrs}
                        onChange={(event) => set({ sysAttrs: event.currentTarget.checked })}
                    />
                </Group>
            </Stack>
        </FieldLock>
    );
}
