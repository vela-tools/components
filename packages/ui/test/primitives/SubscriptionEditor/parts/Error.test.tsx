import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionEditorContext } from "../../../subscriptionEditorContext";
import { SubscriptionEditorProvider } from "../../../../src/primitives/SubscriptionEditor/SubscriptionEditor.context";
import { Error } from "../../../../src/primitives/SubscriptionEditor/parts/Error";

describe("SubscriptionEditor.Error", () => {
    it("renders nothing without an error", () => {
        renderPart(<Error />, SubscriptionEditorProvider, fakeSubscriptionEditorContext());
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows the error", () => {
        renderPart(<Error />, SubscriptionEditorProvider, fakeSubscriptionEditorContext({ error: "Broker down" }));
        expect(screen.getByRole("alert").textContent).toBe("Broker down");
    });
});
