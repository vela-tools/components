import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionListContext, subscriptions } from "../../../subscriptionListContexts";
import { SubscriptionListProvider } from "../../../../src/primitives/SubscriptionList/SubscriptionList.context";
import { EditButton } from "../../../../src/primitives/SubscriptionList/parts/EditButton";
import { RemoveButton } from "../../../../src/primitives/SubscriptionList/parts/RemoveButton";
import { Rows } from "../../../../src/primitives/SubscriptionList/parts/Rows";
import { StatusToggle } from "../../../../src/primitives/SubscriptionList/parts/StatusToggle";

const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("SubscriptionList actions", () => {
    it("StatusToggle calls toggleStatus with the next status", () => {
        const context = fakeSubscriptionListContext();
        renderPart(<Rows>{() => <StatusToggle />}</Rows>, SubscriptionListProvider, context);
        fireEvent.click(button("Pause"));
        fireEvent.click(button("Activate"));
        expect(context.toggleStatus).toHaveBeenNthCalledWith(1, subscriptions[0], "paused");
        expect(context.toggleStatus).toHaveBeenNthCalledWith(2, subscriptions[1], "active");
    });

    it("StatusToggle is hidden for an expired subscription, RemoveButton stays", () => {
        const expired = [{ ...subscriptions[0], status: "expired" as const }];
        renderPart(
            <Rows>
                {() => (
                    <>
                        <StatusToggle />
                        <RemoveButton />
                    </>
                )}
            </Rows>,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ subscriptions: expired }),
        );
        expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Activate" })).toBeNull();
        expect(button("Remove")).toBeTruthy();
    });

    it("StatusToggle and RemoveButton are disabled for pending subscriptions", () => {
        renderPart(
            <Rows>
                {() => (
                    <>
                        <StatusToggle />
                        <RemoveButton />
                    </>
                )}
            </Rows>,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ pendingIds: [subscriptions[0].id] }),
        );
        const [removeFirst, removeSecond] = screen.getAllByRole("button", { name: "Remove" }) as HTMLButtonElement[];
        expect(button("Pause").disabled).toBe(true);
        expect(removeFirst.disabled).toBe(true);
        expect(button("Activate").disabled).toBe(false);
        expect(removeSecond.disabled).toBe(false);
    });

    it("RemoveButton asks first, then calls remove without selecting the row", async () => {
        const context = fakeSubscriptionListContext();
        renderPart(<Rows />, SubscriptionListProvider, context);
        fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
        expect(context.remove).not.toHaveBeenCalled();
        const confirm = await screen.findByRole("button", { name: "Remove subscription" });
        expect(screen.getByText("Dry sensor", { selector: "b" })).toBeTruthy();
        fireEvent.click(confirm);
        expect(context.remove).toHaveBeenCalledWith(subscriptions[1]);
        expect(context.select).not.toHaveBeenCalled();
    });

    it("RemoveButton does nothing when the confirmation is cancelled", async () => {
        const context = fakeSubscriptionListContext();
        renderPart(<Rows />, SubscriptionListProvider, context);
        fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
        fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
        expect(context.remove).not.toHaveBeenCalled();
        expect(context.select).not.toHaveBeenCalled();
    });

    it("EditButton calls edit without selecting the row, and is disabled while pending", () => {
        const context = fakeSubscriptionListContext({ edit: vi.fn(), pendingIds: [subscriptions[1].id] });
        renderPart(<Rows>{() => <EditButton />}</Rows>, SubscriptionListProvider, context);
        const [first, second] = screen.getAllByRole("button", { name: "Edit" }) as HTMLButtonElement[];
        fireEvent.click(first);
        expect(context.edit).toHaveBeenCalledWith(subscriptions[0]);
        expect(context.select).not.toHaveBeenCalled();
        expect(second.disabled).toBe(true);
    });

    it("render nothing without the matching action", () => {
        renderPart(
            <Rows>
                {() => (
                    <>
                        <StatusToggle />
                        <RemoveButton />
                    </>
                )}
            </Rows>,
            SubscriptionListProvider,
            fakeSubscriptionListContext({ toggleStatus: undefined, remove: undefined }),
        );
        expect(screen.queryByRole("button")).toBeNull();
        cleanup();
        renderPart(<Rows>{() => <EditButton />}</Rows>, SubscriptionListProvider, fakeSubscriptionListContext());
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("throw a clear error outside a row", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() =>
            render(
                <SubscriptionListProvider value={fakeSubscriptionListContext()}>
                    <StatusToggle />
                </SubscriptionListProvider>,
            ),
        ).toThrow(
            "<SubscriptionList.StatusToggle> must be used inside SubscriptionList.Table or SubscriptionList.Rows.",
        );
        spy.mockRestore();
    });
});
