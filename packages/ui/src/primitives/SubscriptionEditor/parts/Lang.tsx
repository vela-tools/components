import { TextInput } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function Lang({ className, style }: PartProps) {
    const { values, setField, invalid, editing } = useSubscriptionEditorContext("Lang");
    return (
        <FieldLock fields={["lang"]}>
            <TextInput
                label="Language"
                description={
                    editing
                        ? "This broker can't change the language of an existing subscription."
                        : "For language properties in notifications."
                }
                placeholder="en"
                size="xs"
                className={className}
                style={style}
                value={values.lang}
                readOnly={editing}
                error={invalid.has("lang")}
                onChange={(event) => setField("lang", event.currentTarget.value)}
            />
        </FieldLock>
    );
}
