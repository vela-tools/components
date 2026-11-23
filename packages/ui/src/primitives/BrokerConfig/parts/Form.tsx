import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Group, Stack, TextInput } from "@mantine/core";
import { useBrokerConfigContext, useBrokerConfigEditing, type BrokerConfigValues } from "../BrokerConfig.context";
import type { PartProps } from "./types";

export type BrokerConfigFormProps = PartProps & {
    submitLabel?: ReactNode;
    cancelLabel?: ReactNode;
};

const trimmed = (values: BrokerConfigValues): BrokerConfigValues =>
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));

export function Form(props: BrokerConfigFormProps) {
    const { editing } = useBrokerConfigEditing("Form");
    if (!editing) return null;
    return <FormBody key={editing.id ?? ""} id={editing.id} {...props} />;
}

function FormBody({
    id,
    submitLabel = "Save",
    cancelLabel = "Cancel",
    className,
    style,
}: BrokerConfigFormProps & { id: string | null }) {
    const { fields, valuesOf, validate, save } = useBrokerConfigContext("Form");
    const { close } = useBrokerConfigEditing("Form");
    const [values, setValues] = useState(() => valuesOf(id));

    const clean = trimmed(values);
    const errors = validate?.(clean, id) ?? {};
    const missing = fields.some((field) => field.required && !clean[field.key]);
    const invalid = missing || Object.values(errors).some(Boolean);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (invalid) return;
        save(clean, id);
        close();
    };

    return (
        <form onSubmit={submit} className={className} style={style}>
            <Stack gap={10}>
                {fields.map((field) => (
                    <TextInput
                        key={field.key}
                        label={field.label}
                        size="sm"
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ""}
                        error={errors[field.key]}
                        onChange={(event) => {
                            const value = event.currentTarget.value;
                            setValues((current) => ({ ...current, [field.key]: value }));
                        }}
                    />
                ))}
                <Group justify="flex-end" gap="xs">
                    <Button size="sm" variant="default" onClick={close}>
                        {cancelLabel}
                    </Button>
                    <Button size="sm" type="submit" disabled={invalid}>
                        {submitLabel}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
