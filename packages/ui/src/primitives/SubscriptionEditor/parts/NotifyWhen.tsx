import { Checkbox, Group, Input, NumberInput, SegmentedControl, Stack } from "@mantine/core";
import type { SubscriptionEditorNotify, SubscriptionTrigger } from "../../../utils/subscriptions.types";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";
import { FieldLock } from "./FieldLock";

const TRIGGERS: { value: SubscriptionTrigger; label: string }[] = [
    { value: "entityCreated", label: "Entity created" },
    { value: "entityUpdated", label: "Entity updated" },
    { value: "entityDeleted", label: "Entity deleted" },
    { value: "attributeCreated", label: "Attribute created" },
    { value: "attributeUpdated", label: "Attribute updated" },
    { value: "attributeDeleted", label: "Attribute deleted" },
];

const MODES = [
    { value: "onChange", label: "On change" },
    { value: "every", label: "Every N seconds" },
];

const seconds = (value: number | string) => (typeof value === "number" ? value : undefined);

export function NotifyWhen({ className, style }: PartProps) {
    const { values, setField, invalid, editing } = useSubscriptionEditorContext("NotifyWhen");
    const notify = values.notify;
    const error = invalid.has("notify");
    const set = (patch: Partial<SubscriptionEditorNotify>) => setField("notify", { ...notify, ...patch });

    return (
        <FieldLock fields={["notify"]}>
            <Stack gap="xs" className={className} style={style}>
                <Input.Wrapper
                    label="When to notify"
                    description={
                        editing
                            ? "This broker can't switch an existing subscription between notifying on change and every N seconds. Delete it and create it again."
                            : undefined
                    }
                    size="xs"
                >
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        data={MODES}
                        value={notify.kind}
                        disabled={editing}
                        onChange={(kind) => set({ kind: kind === "every" ? "every" : "onChange" })}
                    />
                </Input.Wrapper>
                {notify.kind === "onChange" ? (
                    <>
                        <Checkbox.Group
                            label="Changes that notify"
                            description="None checked: an attribute is created or updated."
                            size="xs"
                            value={notify.triggers}
                            onChange={(checked) =>
                                set({ triggers: TRIGGERS.filter((t) => checked.includes(t.value)).map((t) => t.value) })
                            }
                        >
                            <Group gap="sm" mt={4}>
                                {TRIGGERS.map((trigger) => (
                                    <Checkbox
                                        key={trigger.value}
                                        size="xs"
                                        value={trigger.value}
                                        label={trigger.label}
                                    />
                                ))}
                            </Group>
                        </Checkbox.Group>
                        <NumberInput
                            label="Minimum seconds between notifications"
                            description="This broker doesn't apply throttling."
                            placeholder="No minimum"
                            size="xs"
                            min={0}
                            value={notify.throttling ?? ""}
                            error={error}
                            onChange={(value) => set({ throttling: seconds(value) })}
                        />
                    </>
                ) : (
                    <NumberInput
                        label="Seconds between notifications"
                        size="xs"
                        min={1}
                        value={notify.seconds ?? ""}
                        error={error}
                        onChange={(value) => set({ seconds: seconds(value) })}
                    />
                )}
            </Stack>
        </FieldLock>
    );
}
