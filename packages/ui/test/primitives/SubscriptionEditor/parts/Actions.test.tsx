import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionEditorContext } from "../../../subscriptionEditorContext";
import { SubscriptionEditorProvider } from "../../../../src/primitives/SubscriptionEditor/SubscriptionEditor.context";
import { Actions } from "../../../../src/primitives/SubscriptionEditor/parts/Actions";

const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("SubscriptionEditor.Actions", () => {
    it("shows the submit label and no cancel without cancel", () => {
        renderPart(<Actions />, SubscriptionEditorProvider, fakeSubscriptionEditorContext({ submitLabel: "Save" }));
        expect(button("Save")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    });

    it("calls cancel", () => {
        const cancel = vi.fn();
        renderPart(<Actions />, SubscriptionEditorProvider, fakeSubscriptionEditorContext({ cancel }));
        fireEvent.click(button("Cancel"));
        expect(cancel).toHaveBeenCalledTimes(1);
    });

    it("disables both buttons while submitting", () => {
        renderPart(
            <Actions />,
            SubscriptionEditorProvider,
            fakeSubscriptionEditorContext({ cancel: vi.fn(), submitting: true }),
        );
        expect(button("Cancel").disabled).toBe(true);
        expect(screen.getAllByRole("button", { hidden: true }).every((b) => (b as HTMLButtonElement).disabled)).toBe(
            true,
        );
    });
});
