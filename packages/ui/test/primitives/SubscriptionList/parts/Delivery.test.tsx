import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionListContext, subscriptions } from "../../../subscriptionListContexts";
import type { SubscriptionRecord } from "../../../../src/utils/subscriptions.types";
import { SubscriptionListProvider } from "../../../../src/primitives/SubscriptionList/SubscriptionList.context";
import { Delivery } from "../../../../src/primitives/SubscriptionList/parts/Delivery";
import { Rows } from "../../../../src/primitives/SubscriptionList/parts/Rows";

const renderDelivery = (delivery: SubscriptionRecord["delivery"]) =>
    renderPart(
        <Rows>{() => <Delivery />}</Rows>,
        SubscriptionListProvider,
        fakeSubscriptionListContext({ subscriptions: [{ ...subscriptions[0], delivery }] }),
    );

describe("SubscriptionList.Delivery", () => {
    it("shows a failing badge, the last notification, the counts and the last failure", () => {
        renderDelivery({
            status: "failed",
            timesSent: 4,
            timesFailed: 2,
            lastNotification: "2026-11-13T10:00:00Z",
            lastFailure: "2026-11-13T09:00:00Z",
        });
        expect(screen.getByText("Failing")).toBeTruthy();
        expect(screen.getByText(/^2026-11-13 \d\d:00:00$/)).toBeTruthy();
        expect(screen.getByText("4 sent, 2 failed")).toBeTruthy();
        expect(screen.getByText(/^Last failure 2026-11-13 \d\d:00:00$/)).toBeTruthy();
    });

    it("shows no badge and no failure line while delivery is ok", () => {
        renderDelivery({
            status: "ok",
            timesSent: 3,
            timesFailed: 1,
            lastNotification: "2026-11-13T10:00:00Z",
            lastFailure: "2026-11-13T09:00:00Z",
        });
        expect(screen.queryByText("Failing")).toBeNull();
        expect(screen.queryByText(/^Last failure/)).toBeNull();
        expect(screen.getByText("3 sent, 1 failed")).toBeTruthy();
    });

    it("says a subscription without delivery state was never notified", () => {
        renderDelivery(undefined);
        expect(screen.getByText("Never notified")).toBeTruthy();
        expect(screen.getByText("0 sent")).toBeTruthy();
    });
});
