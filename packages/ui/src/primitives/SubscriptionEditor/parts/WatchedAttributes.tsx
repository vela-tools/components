import { MultiSelect } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function WatchedAttributes({ className, style }: PartProps) {
    const { values, availableAttributes, setField, invalid } = useSubscriptionEditorContext("WatchedAttributes");
    const data = [...new Set([...availableAttributes, ...values.watchedAttributes])];
    const periodic = values.notify.kind === "every";
    return (
        <FieldLock fields={["watchedAttributes"]}>
            <MultiSelect
                label="Watched attributes"
                description={
                    periodic
                        ? "Not used when notifying every N seconds."
                        : "A change to one of these sends a notification. Empty: the attributes used in the conditions."
                }
                placeholder={values.watchedAttributes.length ? undefined : "Attributes in the conditions"}
                disabled={periodic}
                size="xs"
                searchable
                clearable
                className={className}
                style={style}
                data={data}
                value={values.watchedAttributes}
                error={invalid.has("watchedAttributes")}
                onChange={(watchedAttributes) => setField("watchedAttributes", watchedAttributes)}
            />
        </FieldLock>
    );
}
