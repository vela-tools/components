import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeNotificationListContext } from "../../../subscriptionListContexts";
import { NotificationListProvider } from "../../../../src/primitives/NotificationList/NotificationList.context";
import { Empty } from "../../../../src/primitives/NotificationList/parts/Empty";
import { Error } from "../../../../src/primitives/NotificationList/parts/Error";
import { Item } from "../../../../src/primitives/NotificationList/parts/Item";
import { Items } from "../../../../src/primitives/NotificationList/parts/Items";
import { Table } from "../../../../src/primitives/NotificationList/parts/Table";

describe("NotificationList parts", () => {
    it("Item uses subscriptionNames and falls back to the short id", () => {
        renderPart(<Items />, NotificationListProvider, fakeNotificationListContext());
        expect(screen.getByText("Hot camera")).toBeTruthy();
        expect(screen.getByText("Subscription:9")).toBeTruthy();
        expect(screen.getByText("failed")).toBeTruthy();
    });

    it("Items renders custom content per notification", () => {
        renderPart(
            <Items>
                {(n) => (
                    <Item>
                        <span>{n.id}</span>
                    </Item>
                )}
            </Items>,
            NotificationListProvider,
            fakeNotificationListContext(),
        );
        expect(screen.getByText("n1")).toBeTruthy();
        expect(screen.getByText("n2")).toBeTruthy();
    });

    it("Table shows the chosen columns with names", () => {
        renderPart(
            <Table columns={["subscription", "status"]} />,
            NotificationListProvider,
            fakeNotificationListContext(),
        );
        expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Subscription", "Status"]);
        expect(screen.getByText("Hot camera")).toBeTruthy();
    });

    it("Empty shows only with zero notifications", () => {
        const { unmount } = renderPart(<Empty />, NotificationListProvider, fakeNotificationListContext());
        expect(screen.queryByText("No notifications")).toBeNull();
        unmount();
        renderPart(<Empty />, NotificationListProvider, fakeNotificationListContext({ notifications: [] }));
        expect(screen.getByText("No notifications")).toBeTruthy();
    });

    it("marks stale lists as busy", () => {
        renderPart(<Items />, NotificationListProvider, fakeNotificationListContext({ stale: true }));
        expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    });

    it("Error shows the error", () => {
        renderPart(<Error />, NotificationListProvider, fakeNotificationListContext({ error: "Broker down" }));
        expect(screen.getByRole("alert").textContent).toBe("Broker down");
    });
});
