import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionListContext } from "../../../subscriptionListContexts";
import { SubscriptionListProvider } from "../../../../src/primitives/SubscriptionList/SubscriptionList.context";
import { Table } from "../../../../src/primitives/SubscriptionList/parts/Table";

const headers = () => screen.getAllByRole("columnheader").map((th) => th.textContent);

describe("SubscriptionList.Table", () => {
    it("renders a row per subscription and selects on click", () => {
        const context = fakeSubscriptionListContext({ selectedId: "urn:ngsi-ld:Subscription:2" });
        renderPart(<Table />, SubscriptionListProvider, context);
        const row = screen.getByText("Hot camera").closest("tr")!;
        expect(screen.getByText("Dry sensor").closest("tr")!.getAttribute("aria-selected")).toBe("true");
        fireEvent.click(row);
        expect(context.select).toHaveBeenCalledWith(context.subscriptions[0]);
    });

    it("shows only the chosen columns", () => {
        renderPart(<Table columns={["name", "types"]} />, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(headers()).toEqual(["Name", "Types"]);
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("shows types, condition and watched attributes of each subscription", () => {
        renderPart(<Table />, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(headers()).toEqual([
            "",
            "Name",
            "Types",
            "Condition",
            "Watched",
            "Expires",
            "Notification",
            "Delivery",
            "",
        ]);
        const first = screen.getByText("Hot camera").closest("tr")!;
        const second = screen.getByText("Dry sensor").closest("tr")!;
        expect(first.textContent).toContain("CameraSensor");
        expect(first.textContent).toContain("temperature>30");
        expect(first.textContent).toContain("temperature");
        expect(second.textContent).toContain("Near Delft · 2 km");
        expect(second.textContent).toContain("All attributes");
    });

    it("names a subscription by name, then description, then id", () => {
        const [first] = fakeSubscriptionListContext().subscriptions;
        const unnamed = [
            { ...first, id: "urn:a", name: undefined },
            { ...first, id: "urn:b", name: undefined, description: undefined },
        ];
        renderPart(
            <Table columns={["name"]} />,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ subscriptions: unnamed }),
        );
        expect(screen.getByText("Cameras running above 30 degrees")).toBeTruthy();
        expect(screen.getByText("urn:b")).toBeTruthy();
    });

    it("shows the expiry, and nothing for a subscription that never expires", () => {
        renderPart(<Table columns={["name", "expires"]} />, SubscriptionListProvider, fakeSubscriptionListContext());
        const [first, second] = screen.getAllByRole("row").slice(1);
        expect(first.textContent).toMatch(/^Hot camera2027-01-15 \d\d:30:00$/);
        expect(second.textContent).toBe("Dry sensor");
    });

    it("says a subscription without q or geo fires on any change", () => {
        const [first] = fakeSubscriptionListContext().subscriptions;
        renderPart(
            <Table columns={["name", "condition"]} />,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ subscriptions: [{ ...first, q: undefined }] }),
        );
        expect(screen.getByText("Any change")).toBeTruthy();
    });

    it("drops the actions column without toggle and remove", () => {
        renderPart(
            <Table />,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ toggleStatus: undefined, remove: undefined }),
        );
        expect(headers()).toHaveLength(8);
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("shows the empty text across all columns", () => {
        renderPart(
            <Table />,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ subscriptions: [], emptyText: "Nothing yet" }),
        );
        const cell = screen.getByText("Nothing yet").closest("td")!;
        expect(cell.getAttribute("colspan")).toBe("9");
    });

    it("pages the rows", () => {
        renderPart(<Table pageSize={1} />, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(screen.queryByText("Dry sensor")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "2" }));
        expect(screen.getByText("Dry sensor")).toBeTruthy();
    });

    it("shows Edit when the context has edit", () => {
        renderPart(
            <Table actions={["edit"]} />,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ edit: vi.fn() }),
        );
        expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    });

    it("shows only the chosen actions", () => {
        renderPart(<Table actions={["toggle"]} />, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    });

    it("drops the actions column when no chosen action is available", () => {
        renderPart(
            <Table actions={["remove"]} />,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ remove: undefined }),
        );
        expect(headers()).toHaveLength(8);
    });
});
