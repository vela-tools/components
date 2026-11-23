import { Textarea } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function Description({ className, style }: PartProps) {
    const { values, setField, invalid } = useSubscriptionEditorContext("Description");
    return (
        <FieldLock fields={["description"]}>
            <Textarea
                label="Description"
                placeholder="Optional"
                size="xs"
                autosize
                minRows={2}
                className={className}
                style={style}
                value={values.description}
                error={invalid.has("description")}
                onChange={(event) => setField("description", event.currentTarget.value)}
            />
        </FieldLock>
    );
}
