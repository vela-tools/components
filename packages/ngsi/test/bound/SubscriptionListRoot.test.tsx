import { SubscriptionList } from "@vela-tools/ui";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { fixtureTypes } from "../../src/testing/fixtures";
import { SubscriptionListRoot, type SubscriptionListRootProps } from "../../src/bound/SubscriptionListRoot";

afterEach(cleanup);

const CROWD = "Crowd flow above 100 people";
const CAMERA = "Camera reports a fault";

function List(props: Partial<SubscriptionListRootProps> & { label?: string }) {
    return (
        <section aria-label={props.label ?? "list"}>
            <SubscriptionListRoot {...props}>
                <SubscriptionList.Error />
                <SubscriptionList.Table />
            </SubscriptionListRoot>
        </section>
    );
}

const list = (label = "list") => within(screen.getByRole("region", { name: label }));
const row = (name: string, label = "list") => list(label).getByText(name).closest("tr") as HTMLElement;

describe("SubscriptionListRoot", () => {
    it("lists the subscriptions from the adapter", async () => {
        renderWithNgsi(<List />);
        expect(screen.getByText("Loading…")).toBeTruthy();
        expect(await screen.findByText(CROWD)).toBeTruthy();
        expect(screen.getByText(CAMERA)).toBeTruthy();
    });

    it("passes the full subscription to onEdit, and shows Edit only with onEdit", async () => {
        const onEdit = vi.fn();
        renderWithNgsi(<List onEdit={onEdit} />);
        await screen.findByText(CAMERA);
        fireEvent.click(within(row(CAMERA)).getByRole("button", { name: "Edit" }));
        expect(onEdit).toHaveBeenCalledWith(
            expect.objectContaining({ id: "urn:ngsi-ld:Subscription:camera-faulty", types: [fixtureTypes.Camera] }),
        );
        cleanup();
        renderWithNgsi(<List />);
        await screen.findByText(CAMERA);
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    });

    it("shows the types, q and geo region of each subscription", async () => {
        renderWithNgsi(<List />);
        await screen.findByText(CROWD);
        const crowd = within(row(CROWD));
        const camera = within(row(CAMERA));
        expect(crowd.getByText("CrowdFlowObserved")).toBeTruthy();
        expect(crowd.getByText("peopleCount>100")).toBeTruthy();
        expect(camera.getByText("Camera")).toBeTruthy();
        expect(camera.getByText('status=="faulty"')).toBeTruthy();
        expect(camera.getByText("Near 52.01°, -25.64° · 2 km")).toBeTruthy();
    });

    it("disables the row while the status change is pending, then shows the new status", async () => {
        const { adapters } = renderWithNgsi(<List />, { latencyMs: 30 });
        await screen.findByText(CROWD);
        const setStatus = vi.spyOn(adapters.subscriptions!, "setStatus");

        fireEvent.click(within(row(CROWD)).getByRole("button", { name: "Pause" }));

        expect((within(row(CROWD)).getByRole("button", { name: "Pause" }) as HTMLButtonElement).disabled).toBe(true);
        await waitFor(() => expect(within(row(CROWD)).getByRole("button", { name: "Activate" })).toBeTruthy());
        expect(setStatus).toHaveBeenCalledWith("urn:ngsi-ld:Subscription:crowd-high", "paused");
    });

    it("removes a row before the adapter answers", async () => {
        const { adapters } = renderWithNgsi(<List />, { latencyMs: 400 });
        await screen.findByText(CAMERA, undefined, { timeout: 2000 });
        const remove = vi.spyOn(adapters.subscriptions!, "remove");

        fireEvent.click(within(row(CAMERA)).getByRole("button", { name: "Remove" }));
        fireEvent.click(await screen.findByRole("button", { name: "Remove subscription" }));

        await waitFor(() => expect(screen.queryByText(CAMERA)).toBeNull(), { timeout: 200 });
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it("rolls a failed remove back and shows the error", async () => {
        renderWithNgsi(<List />, { failOn: ["subscriptions.remove"] });
        await screen.findByText(CAMERA);

        fireEvent.click(within(row(CAMERA)).getByRole("button", { name: "Remove" }));
        fireEvent.click(await screen.findByRole("button", { name: "Remove subscription" }));

        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(row(CAMERA)).toBeTruthy();
    });

    it("shows what the broker said when an action fails", async () => {
        const refused = Object.assign(new Error("PATCH https://broker.example/x → 403"), {
            status: 403,
            detail: "Not allowed for this tenant",
        });
        renderWithNgsi(<List />, { failOn: (method) => method === "subscriptions.setStatus" && refused });
        await screen.findByText(CROWD);

        fireEvent.click(within(row(CROWD)).getByRole("button", { name: "Pause" }));

        expect((await screen.findByRole("alert")).textContent).toBe(
            "The broker answered 403: Not allowed for this tenant",
        );
    });

    it("shows a failed list request", async () => {
        renderWithNgsi(<List />, { failOn: ["subscriptions.list"] });
        expect(await screen.findByRole("alert")).toBeTruthy();
    });

    it("keeps the selection local to each Root and toggles it on a second click", async () => {
        renderWithNgsi(
            <>
                <List label="first" />
                <List label="second" />
            </>,
        );
        await waitFor(() => expect(list("second").getByText(CROWD)).toBeTruthy());

        fireEvent.click(row(CROWD, "first"));
        expect(row(CROWD, "first").getAttribute("aria-selected")).toBe("true");
        expect(row(CROWD, "second").getAttribute("aria-selected")).toBe("false");

        fireEvent.click(row(CROWD, "first"));
        expect(row(CROWD, "first").getAttribute("aria-selected")).toBe("false");
    });

    it("only reports the selection when controlled", async () => {
        const onSelect = vi.fn();
        renderWithNgsi(<List selectedId={null} onSelect={onSelect} />);
        await screen.findByText(CROWD);

        fireEvent.click(row(CROWD));

        expect(onSelect).toHaveBeenCalledWith("urn:ngsi-ld:Subscription:crowd-high");
        expect(row(CROWD).getAttribute("aria-selected")).toBe("false");
    });

    it("clears the selection when the selected subscription is removed", async () => {
        const onSelect = vi.fn();
        renderWithNgsi(<List selectedId="urn:ngsi-ld:Subscription:camera-faulty" onSelect={onSelect} />);
        await screen.findByText(CAMERA);

        fireEvent.click(within(row(CAMERA)).getByRole("button", { name: "Remove" }));
        fireEvent.click(await screen.findByRole("button", { name: "Remove subscription" }));

        await waitFor(() => expect(onSelect).toHaveBeenCalledWith(null));
    });

    it("makes rows unselectable with selectable={false}", async () => {
        const onSelect = vi.fn();
        renderWithNgsi(<List selectable={false} onSelect={onSelect} />);
        await screen.findByText(CROWD);

        fireEvent.click(row(CROWD));

        expect(onSelect).not.toHaveBeenCalled();
        expect(row(CROWD).getAttribute("aria-selected")).toBeNull();
    });
});
