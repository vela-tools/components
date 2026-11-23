import { TextInput } from "@mantine/core";
import { fromLocalDateTime, toLocalDateTime } from "../../../utils/subscriptions";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function ExpiresAt({ className, style }: PartProps) {
    const { values, setField, invalid } = useSubscriptionEditorContext("ExpiresAt");
    return (
        <FieldLock fields={["expiresAt"]}>
            <TextInput
                type="datetime-local"
                label="Expires"
                description="Empty: never expires."
                size="xs"
                className={className}
                style={style}
                value={toLocalDateTime(values.expiresAt)}
                error={invalid.has("expiresAt")}
                onChange={(event) => setField("expiresAt", fromLocalDateTime(event.currentTarget.value))}
            />
        </FieldLock>
    );
}
