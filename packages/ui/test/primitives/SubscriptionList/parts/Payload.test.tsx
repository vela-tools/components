import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionListContext, subscriptions } from "../../../subscriptionListContexts";
import type { SubscriptionRecord } from "../../../../src/utils/subscriptions.types";
import { SubscriptionListProvider } from "../../../../src/primitives/SubscriptionList/SubscriptionList.context";
import { Endpoint } from "../../../../src/primitives/SubscriptionList/parts/Endpoint";
import { Payload } from "../../../../src/primitives/SubscriptionList/parts/Payload";
import { Rows } from "../../../../src/primitives/SubscriptionList/parts/Rows";

const renderNotification = (record: Partial<SubscriptionRecord>) =>
    renderPart(
        <Rows>
            {() => (
                <>
                    <Payload />
                    <Endpoint />
                </>
            )}
        </Rows>,
        SubscriptionListProvider,
        fakeSubscriptionListContext({ subscriptions: [{ ...subscriptions[1], ...record }] }),
    );

describe("SubscriptionList.Payload and Endpoint", () => {
    it("shows the format, the extras, pick and omit, and the endpoint", () => {
        renderNotification({
            payload: {
                format: "normalized",
                pick: ["temperature", "status"],
                omit: ["id"],
                showChanges: true,
                join: "flat",
            },
            endpoint: { uri: "https://hook.example/scorpiowebhook", accept: "application/json" },
        });
        expect(screen.getByText("Normalized")).toBeTruthy();
        expect(screen.getByText("+ previous values, linked entities (flat)")).toBeTruthy();
        expect(screen.getByText("Only temperature, status")).toBeTruthy();
        expect(screen.getByText("Without id")).toBeTruthy();
        expect(screen.getByText("https://hook.example/scorpiowebhook")).toBeTruthy();
    });

    it("shows only the format when nothing else is set", () => {
        renderNotification({ payload: { format: "keyValues" } });
        expect(screen.getByText("Key-values")).toBeTruthy();
        expect(screen.queryByText(/^\+/)).toBeNull();
        expect(screen.queryByText(/^Only/)).toBeNull();
    });

    it("renders nothing without a payload or endpoint", () => {
        renderNotification({});
        expect(screen.queryByText("Normalized")).toBeNull();
        expect(screen.queryByText(/https:/)).toBeNull();
    });
});
