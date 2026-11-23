import { vi } from "vitest";
import type { SubscriptionEditorContextValue } from "../src/primitives/SubscriptionEditor/SubscriptionEditor.context";
import { emptyEditorValues } from "../src/utils/subscriptions";

export function fakeSubscriptionEditorContext(
    overrides: Partial<SubscriptionEditorContextValue> = {},
): SubscriptionEditorContextValue {
    return {
        values: emptyEditorValues,
        setField: vi.fn(),
        availableAttributes: ["status", "temperature"],
        invalid: new Set(),
        submitting: false,
        submit: vi.fn(),
        ...overrides,
    };
}
