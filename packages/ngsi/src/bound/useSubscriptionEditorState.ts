import { useCallback, useState } from "react";
import { useNgsiCommands } from "../hooks/useNgsi";
import type { InvalidDraft, RequestFailed } from "../runtime/commands";
import type { Subscription, SubscriptionDraft, SubscriptionPatch } from "../types";
import { errorMessage } from "./errorMessage";

type SubscriptionEditorState = {
    submitting: boolean;
    invalidFields: (keyof SubscriptionDraft)[];
    error: string | null;
};

const PARTLY_APPLIED =
    "The broker rejected the change, but may have applied part of it. The list shows what it has now.";

const IDLE_EDITOR: SubscriptionEditorState = { submitting: false, invalidFields: [], error: null };

type Failure =
    InvalidDraft | RequestFailed | { ok: false; reason: "no-subscriptions-adapter" | "subscription-not-found" };

function failedState(result: Failure): SubscriptionEditorState {
    if (result.reason === "invalid-draft") {
        const invalidFields = [...new Set(result.issues.map((issue) => issue.field))];
        return { submitting: false, invalidFields, error: result.issues.map((issue) => issue.message).join(" ") };
    }
    if (result.reason === "request-failed")
        return { submitting: false, invalidFields: [], error: errorMessage(result.error) };
    if (result.reason === "subscription-not-found") {
        return { submitting: false, invalidFields: [], error: "This subscription no longer exists on the broker." };
    }
    return { submitting: false, invalidFields: [], error: "Subscriptions are not supported by this broker." };
}

export function useSubscriptionEditorState() {
    const commands = useNgsiCommands().subscriptions;
    const [state, setState] = useState<SubscriptionEditorState>(IDLE_EDITOR);

    const reset = useCallback(() => setState(IDLE_EDITOR), []);

    const create = useCallback(
        async (draft: SubscriptionDraft): Promise<Subscription | null> => {
            setState({ ...IDLE_EDITOR, submitting: true });
            const result = await commands.create(draft);
            setState(result.ok ? IDLE_EDITOR : failedState(result));
            return result.ok ? result.subscription : null;
        },
        [commands],
    );

    const update = useCallback(
        async (
            id: string,
            patch: SubscriptionPatch,
            onReread?: (current: Subscription) => void,
        ): Promise<Subscription | null> => {
            setState({ ...IDLE_EDITOR, submitting: true });
            const result = await commands.update(id, patch);
            if (result.ok) {
                setState(IDLE_EDITOR);
                return result.subscription;
            }
            if (result.reason === "request-failed") {
                const current = "subscription" in result ? result.subscription : undefined;
                const error =
                    current === null
                        ? "This subscription no longer exists on the broker."
                        : `${errorMessage(result.error)} ${PARTLY_APPLIED}`;
                setState({ submitting: false, invalidFields: [], error });
                if (current) onReread?.(current);
                return null;
            }
            setState(failedState(result));
            return null;
        },
        [commands],
    );

    return { state, create, update, reset };
}
