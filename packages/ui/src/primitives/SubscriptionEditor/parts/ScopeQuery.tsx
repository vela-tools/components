import { TextInput } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

export function ScopeQuery({ className, style }: PartProps) {
    const { values, setField, invalid } = useSubscriptionEditorContext("ScopeQuery");
    return (
        <FieldLock fields={["scopeQ"]}>
            <TextInput
                label="Scope query"
                description="Empty: any scope."
                placeholder="/Madrid/#"
                size="xs"
                className={className}
                style={style}
                value={values.scopeQ}
                error={invalid.has("scopeQ")}
                onChange={(event) => setField("scopeQ", event.currentTarget.value)}
            />
        </FieldLock>
    );
}
