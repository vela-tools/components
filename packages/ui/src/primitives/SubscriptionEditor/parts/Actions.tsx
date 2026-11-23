import { Button, Group } from "@mantine/core";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";

export function Actions({ className, style }: PartProps) {
    const { submitting, submitLabel = "Create", cancel } = useSubscriptionEditorContext("Actions");
    return (
        <Group gap="xs" className={className} style={style}>
            <Button type="submit" size="xs" loading={submitting}>
                {submitLabel}
            </Button>
            {cancel && (
                <Button type="button" size="xs" variant="default" disabled={submitting} onClick={cancel}>
                    Cancel
                </Button>
            )}
        </Group>
    );
}
