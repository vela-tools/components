import type { SubmitEvent, ReactNode } from "react";
import { useSubscriptionEditorContext } from "../SubscriptionEditor.context";
import type { PartProps } from "./types";

export type SubscriptionEditorFormProps = PartProps & { children?: ReactNode };

export function Form({ className, style, children }: SubscriptionEditorFormProps) {
    const { submit } = useSubscriptionEditorContext("Form");
    const onSubmit = (event: SubmitEvent) => {
        event.preventDefault();
        submit();
    };
    return (
        <form onSubmit={onSubmit} className={className} style={style}>
            {children}
        </form>
    );
}
