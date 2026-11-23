import {
    Actions,
    Advanced,
    Description,
    Endpoint,
    Error,
    ExpiresAt,
    Form,
    Format,
    Lang,
    Name,
    NotifyWhen,
    Payload,
    ScopeQuery,
    WatchedAttributes,
} from "./parts";

export const SubscriptionEditor = {
    Form,
    Name,
    Description,
    Endpoint,
    WatchedAttributes,
    NotifyWhen,
    ExpiresAt,
    ScopeQuery,
    Lang,
    Format,
    Payload,
    Advanced,
    Error,
    Actions,
};

export type SubscriptionEditorParts = typeof SubscriptionEditor;

export { SubscriptionEditorProvider, useSubscriptionEditorContext } from "./SubscriptionEditor.context";
export type { SubscriptionEditorContextValue, SubscriptionEditorField } from "./SubscriptionEditor.context";
export type { SubscriptionEditorFormProps, SubscriptionEditorPartProps } from "./parts";
