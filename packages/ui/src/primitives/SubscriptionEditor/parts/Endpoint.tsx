import { TextInput } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function Endpoint({ className, style }: PartProps) {
    const { values, setField, invalid } = useSubscriptionEditorContext("Endpoint");
    return (
        <FieldLock fields={["endpoint"]}>
            <TextInput
                label="Notification URI"
                description="The broker sends the notifications here, so it has to be reachable from the broker."
                placeholder="https://example.org/notify"
                size="xs"
                className={className}
                style={style}
                value={values.endpoint}
                error={invalid.has("endpoint")}
                onChange={(event) => setField("endpoint", event.currentTarget.value)}
            />
        </FieldLock>
    );
}
