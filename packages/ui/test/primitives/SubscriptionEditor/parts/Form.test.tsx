import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionEditorContext } from "../../../subscriptionEditorContext";
import { SubscriptionEditorProvider } from "../../../../src/primitives/SubscriptionEditor/SubscriptionEditor.context";
import { Actions } from "../../../../src/primitives/SubscriptionEditor/parts/Actions";
import { Form } from "../../../../src/primitives/SubscriptionEditor/parts/Form";

describe("SubscriptionEditor.Form", () => {
    it("calls submit when the form is submitted", () => {
        const context = fakeSubscriptionEditorContext();
        renderPart(
            <Form>
                <Actions />
            </Form>,
            SubscriptionEditorProvider,
            context,
        );
        fireEvent.click(screen.getByRole("button", { name: "Create" }));
        expect(context.submit).toHaveBeenCalledTimes(1);
    });
});
