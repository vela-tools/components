import { TextInput } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function Name({ className, style }: PartProps) {
    const { values, setField, invalid } = useSubscriptionEditorContext("Name");
    return (
        <FieldLock fields={["name"]}>
            <TextInput
                label="Name"
                placeholder="Name"
                size="xs"
                className={className}
                style={style}
                value={values.name}
                error={invalid.has("name")}
                onChange={(event) => setField("name", event.currentTarget.value)}
            />
        </FieldLock>
    );
}
