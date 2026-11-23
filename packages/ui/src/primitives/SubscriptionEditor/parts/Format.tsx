import { Input, SegmentedControl } from "@mantine/core";
import { NOTIFICATION_FORMATS } from "../../../utils/subscriptions";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

const DESCRIPTIONS = {
    normalized: "Every attribute with its type, value and metadata.",
    concise: "Values with metadata, without the attribute types.",
    keyValues: "Attribute names and values only.",
};

export function Format({ className, style }: PartProps) {
    const { values, setField } = useSubscriptionEditorContext("Format");
    const payload = values.payload;
    return (
        <FieldLock fields={["payload"]}>
            <Input.Wrapper
                label="Notification format"
                description={DESCRIPTIONS[payload.format]}
                size="xs"
                className={className}
                style={style}
            >
                <SegmentedControl
                    size="xs"
                    fullWidth
                    mt={4}
                    data={NOTIFICATION_FORMATS}
                    value={payload.format}
                    onChange={(value) => {
                        const format = NOTIFICATION_FORMATS.find((f) => f.value === value)?.value ?? payload.format;
                        setField("payload", {
                            ...payload,
                            format,
                            showChanges: format === "keyValues" ? false : payload.showChanges,
                        });
                    }}
                />
            </Input.Wrapper>
        </FieldLock>
    );
}
