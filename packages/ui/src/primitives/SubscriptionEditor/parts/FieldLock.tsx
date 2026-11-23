import type { ReactNode } from "react";
import { Locked } from "../../Locked";
import { useSubscriptionEditorContext, type SubscriptionEditorField } from "../SubscriptionEditor.context";

export function FieldLock({ fields, children }: { fields: SubscriptionEditorField[]; children: ReactNode }) {
    const { locked } = useSubscriptionEditorContext("FieldLock");
    const reasons = [...new Set(fields.flatMap((field) => (locked?.[field] ? [locked[field]] : [])))];
    return <Locked reason={reasons.join(" ") || undefined}>{children}</Locked>;
}
