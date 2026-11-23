import type { ReactNode } from "react";
import type { SubscriptionEditorValues } from "../../utils/subscriptions.types";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type SubscriptionEditorField = keyof SubscriptionEditorValues;

export type SubscriptionEditorContextValue = {
    values: SubscriptionEditorValues;
    setField: <K extends SubscriptionEditorField>(field: K, value: SubscriptionEditorValues[K]) => void;
    availableAttributes: string[];
    invalid: ReadonlySet<SubscriptionEditorField>;
    editing?: boolean;
    locked?: Partial<Record<SubscriptionEditorField, string>>;
    error?: ReactNode;
    submitting: boolean;
    submit: () => void;
    cancel?: () => void;
    submitLabel?: ReactNode;
};

export const [SubscriptionEditorProvider, useSubscriptionEditorContext] =
    createPrimitiveContext<SubscriptionEditorContextValue>("SubscriptionEditor");
