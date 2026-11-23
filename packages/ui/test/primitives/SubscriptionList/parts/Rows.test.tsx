import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionListContext, subscriptions } from "../../../subscriptionListContexts";
import { SubscriptionListProvider } from "../../../../src/primitives/SubscriptionList/SubscriptionList.context";
import { Empty } from "../../../../src/primitives/SubscriptionList/parts/Empty";
import { Error } from "../../../../src/primitives/SubscriptionList/parts/Error";
import { Row } from "../../../../src/primitives/SubscriptionList/parts/Row";
import { Rows } from "../../../../src/primitives/SubscriptionList/parts/Rows";

describe("SubscriptionList.Rows and Row", () => {
    it("renders custom row content per subscription", () => {
        renderPart(
            <Rows>{(s) => <span>{s.types.join("+")}</span>}</Rows>,
            SubscriptionListProvider,
            fakeSubscriptionListContext(),
        );
        expect(screen.getByText("Camera+Sensor")).toBeTruthy();
        expect(screen.getByText("Sensor")).toBeTruthy();
    });

    it("shows every type, the q and the geo region in the default row", () => {
        renderPart(<Rows />, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(screen.getByText("Camera")).toBeTruthy();
        expect(screen.getAllByText("Sensor")).toHaveLength(2);
        expect(screen.getByText("temperature>30")).toBeTruthy();
        expect(screen.getByText("Near Delft · 2 km")).toBeTruthy();
    });

    it("marks id selectors and members that could not be read", () => {
        const marked = [{ ...subscriptions[0], idSelectors: true, unreadable: ["throttling", "q"] }];
        renderPart(<Rows />, SubscriptionListProvider, fakeSubscriptionListContext({ subscriptions: marked }));
        expect(screen.getByText("+ id selectors")).toBeTruthy();
        expect(screen.getByText("Can't read: throttling, q")).toBeTruthy();
    });

    it("Row selects its subscription and marks the selected one", () => {
        const context = fakeSubscriptionListContext({ selectedId: subscriptions[0].id });
        renderPart(
            <Rows>
                {(s) => (
                    <Row>
                        <span>{s.name ?? s.description}</span>
                    </Row>
                )}
            </Rows>,
            SubscriptionListProvider,
            context,
        );
        const first = screen.getByText("Hot camera").parentElement!;
        expect(first.getAttribute("aria-current")).toBe("true");
        fireEvent.click(screen.getByText("Dry sensor"));
        expect(context.select).toHaveBeenCalledWith(subscriptions[1]);
    });
});

describe("SubscriptionList.Empty", () => {
    it("shows the empty text only without subscriptions", () => {
        const { unmount } = renderPart(<Empty />, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(screen.queryByText("No subscriptions")).toBeNull();
        unmount();
        renderPart(<Empty />, SubscriptionListProvider, fakeSubscriptionListContext({ subscriptions: [] }));
        expect(screen.getByText("No subscriptions")).toBeTruthy();
    });
});

describe("SubscriptionList.Error", () => {
    it("shows the error only when there is one", () => {
        const { unmount } = renderPart(<Error />, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(screen.queryByRole("alert")).toBeNull();
        unmount();
        renderPart(<Error />, SubscriptionListProvider, fakeSubscriptionListContext({ error: "Broker down" }));
        expect(screen.getByRole("alert").textContent).toBe("Broker down");
    });
});
