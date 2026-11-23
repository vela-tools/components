import { QueryBuilder, SubscriptionEditor, SubscriptionList } from "@vela-tools/ui";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { fixtureSubscriptions, fixtureTypes } from "../../src/testing/fixtures";
import type { SubscriptionDraft } from "../../src/types";
import { SubscriptionEditorRoot, type SubscriptionEditorRootProps } from "../../src/bound/SubscriptionEditorRoot";
import { SubscriptionListRoot } from "../../src/bound/SubscriptionListRoot";

afterEach(cleanup);

const completeValues: Partial<SubscriptionDraft> = {
    name: "Camera goes offline",
    types: [fixtureTypes.Camera],
    q: 'status=="offline"',
    endpoint: { uri: "https://hook.example/notify" },
};

function Editor(props: Partial<SubscriptionEditorRootProps>) {
    return (
        <SubscriptionEditorRoot {...props}>
            <SubscriptionEditor.Form>
                <SubscriptionEditor.Name />
                <SubscriptionEditor.Endpoint />
                <QueryBuilder.EntityTypes />
                <QueryBuilder.Conditions>
                    <QueryBuilder.Preview />
                </QueryBuilder.Conditions>
                <QueryBuilder.GeoRegion />
                <SubscriptionEditor.NotifyWhen />
                <SubscriptionEditor.WatchedAttributes />
                <SubscriptionEditor.ExpiresAt />
                <SubscriptionEditor.Format />
                <SubscriptionEditor.Error />
                <SubscriptionEditor.Actions />
            </SubscriptionEditor.Form>
        </SubscriptionEditorRoot>
    );
}

const create = () => fireEvent.click(screen.getByRole("button", { name: "Create" }));
const typeRow = (name: string) => screen.findByRole("button", { name: new RegExp(`^${name}\\b`) });
const nameInput = () => screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;

describe("SubscriptionEditorRoot", () => {
    it("creates a subscription from both families, calls onCreated and resets the form", async () => {
        const onCreated = vi.fn();
        renderWithNgsi(
            <>
                <Editor defaultValues={completeValues} onCreated={onCreated} />
                <SubscriptionListRoot>
                    <SubscriptionList.Rows />
                </SubscriptionListRoot>
            </>,
        );
        fireEvent.change(nameInput(), { target: { value: "Camera is down" } });
        create();

        await waitFor(() =>
            expect(onCreated).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Camera is down",
                    types: [fixtureTypes.Camera],
                    q: 'status=="offline"',
                    watchedAttributes: ["status"],
                }),
            ),
        );
        expect(await screen.findByText("Camera is down")).toBeTruthy();
        expect(nameInput().value).toBe("Camera goes offline");
    });

    it("sends every selected type and the geo region", async () => {
        const onCreated = vi.fn();
        const geo = { lat: 52.01, lon: 4.36, radiusKm: 2 };
        renderWithNgsi(<Editor defaultValues={{ ...completeValues, geo }} onCreated={onCreated} />);
        fireEvent.click(await typeRow("CrowdFlowObserved"));
        create();

        await waitFor(() =>
            expect(onCreated).toHaveBeenCalledWith(
                expect.objectContaining({ types: [fixtureTypes.Camera, fixtureTypes.CrowdFlowObserved], geo }),
            ),
        );
    });

    it("keeps the watched attributes the user picked", async () => {
        const onCreated = vi.fn();
        renderWithNgsi(
            <Editor defaultValues={{ ...completeValues, watchedAttributes: ["name"] }} onCreated={onCreated} />,
        );
        create();

        await waitFor(() =>
            expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ watchedAttributes: ["name"] })),
        );
    });

    it("passes a q the builder cannot show through text mode, watching every attribute", async () => {
        const onCreated = vi.fn();
        const q = 'status=="faulty"|status=="offline"';
        renderWithNgsi(<Editor defaultValues={{ ...completeValues, q }} onCreated={onCreated} />);
        await typeRow("Camera");
        create();

        await waitFor(() =>
            expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ q, watchedAttributes: [] })),
        );
    });

    it("sends every N seconds and the plain members, without filling watched attributes from the conditions", async () => {
        const onCreated = vi.fn();
        const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
        renderWithNgsi(
            <Editor
                defaultValues={{
                    ...completeValues,
                    description: "Long text",
                    notify: { kind: "every", seconds: 60 },
                    expiresAt,
                    scopeQ: "/Delft/#",
                    lang: "nl",
                }}
                onCreated={onCreated}
            />,
        );
        await typeRow("Camera");
        create();

        await waitFor(() =>
            expect(onCreated).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Camera goes offline",
                    description: "Long text",
                    notify: { kind: "every", seconds: 60 },
                    watchedAttributes: [],
                    expiresAt,
                    scopeQ: "/Delft/#",
                    lang: "nl",
                }),
            ),
        );
    });

    it("marks an expiry in the past without calling the adapter", async () => {
        const { adapters } = renderWithNgsi(
            <Editor defaultValues={{ ...completeValues, expiresAt: "2020-01-01T00:00:00.000Z" }} />,
        );
        const adapterCreate = vi.spyOn(adapters.subscriptions!, "create");
        await typeRow("Camera");
        create();

        expect(await screen.findByText("The expiry must be a date and time in the future.")).toBeTruthy();
        expect(screen.getByLabelText("Expires").getAttribute("aria-invalid")).toBe("true");
        expect(adapterCreate).not.toHaveBeenCalled();
    });

    describe("edit mode", () => {
        const subscription = { ...fixtureSubscriptions[1], name: "Camera fault" };

        it("pre-fills the form, saves only what changed, calls onUpdated and keeps the values", async () => {
            const onUpdated = vi.fn();
            const { adapters } = renderWithNgsi(<Editor subscription={subscription} onUpdated={onUpdated} />);
            const update = vi.spyOn(adapters.subscriptions!, "update");
            await typeRow("Camera");
            expect(nameInput().value).toBe("Camera fault");
            expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();

            fireEvent.change(nameInput(), { target: { value: "Camera broken" } });
            fireEvent.click(screen.getByRole("button", { name: "Save" }));

            await waitFor(() =>
                expect(onUpdated).toHaveBeenCalledWith(
                    expect.objectContaining({ id: subscription.id, name: "Camera broken" }),
                ),
            );
            expect(update).toHaveBeenCalledWith(subscription.id, { name: "Camera broken" });
            expect(nameInput().value).toBe("Camera broken");
        });

        it("compares the next save with the saved values", async () => {
            const { adapters } = renderWithNgsi(<Editor subscription={subscription} />);
            const update = vi.spyOn(adapters.subscriptions!, "update");
            await typeRow("Camera");
            fireEvent.change(nameInput(), { target: { value: "Camera broken" } });
            fireEvent.click(screen.getByRole("button", { name: "Save" }));
            await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
            fireEvent.click(screen.getByRole("button", { name: "Save" }));
            await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toHaveProperty("disabled", false));
            expect(update).toHaveBeenCalledTimes(1);
        });

        it("does not fill watched attributes from the conditions", async () => {
            const onUpdated = vi.fn();
            const { adapters } = renderWithNgsi(
                <Editor subscription={{ ...subscription, watchedAttributes: [] }} onUpdated={onUpdated} />,
            );
            const update = vi.spyOn(adapters.subscriptions!, "update");
            await typeRow("Camera");
            fireEvent.change(nameInput(), { target: { value: "Any change" } });
            fireEvent.click(screen.getByRole("button", { name: "Save" }));
            await waitFor(() => expect(onUpdated).toHaveBeenCalled());
            expect(update).toHaveBeenCalledWith(subscription.id, { name: "Any change" });
        });

        it("saves a changed format as the whole payload, and keeps the format of a subscription without one", async () => {
            const { adapters } = renderWithNgsi(<Editor subscription={subscription} />);
            const update = vi.spyOn(adapters.subscriptions!, "update");
            await typeRow("Camera");
            expect(screen.getByRole("radio", { name: "Normalized" })).toHaveProperty("checked", true);
            fireEvent.click(screen.getByText("Concise"));
            fireEvent.click(screen.getByRole("button", { name: "Save" }));
            await waitFor(() =>
                expect(update).toHaveBeenCalledWith(subscription.id, { payload: { format: "concise" } }),
            );
        });

        it("shows what a change breaks without calling the adapter", async () => {
            const { adapters } = renderWithNgsi(<Editor subscription={subscription} />);
            const update = vi.spyOn(adapters.subscriptions!, "update");
            await typeRow("Camera");
            fireEvent.change(screen.getByLabelText("Expires"), { target: { value: "2020-01-01T00:00" } });
            fireEvent.click(screen.getByRole("button", { name: "Save" }));
            expect(await screen.findByText("The expiry must be a date and time in the future.")).toBeTruthy();
            expect(update).not.toHaveBeenCalled();
        });
    });

    it("creates a subscription in the key-values format by default", async () => {
        const onCreated = vi.fn();
        renderWithNgsi(<Editor defaultValues={completeValues} onCreated={onCreated} />);
        await typeRow("Camera");
        create();
        await waitFor(() =>
            expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ payload: { format: "keyValues" } })),
        );
    });

    it("offers the attributes of the selected types as watched attributes", async () => {
        renderWithNgsi(<Editor defaultValues={completeValues} />);
        await typeRow("Camera");
        fireEvent.click(screen.getByRole("combobox", { name: "Watched attributes" }));
        const options = await screen.findAllByRole("option", { hidden: true });
        expect(options.map((o) => o.textContent)).toContain("status");
    });

    it("clears only the conditions on New query", async () => {
        const onCreated = vi.fn();
        renderWithNgsi(<Editor defaultValues={completeValues} onCreated={onCreated} />);
        await typeRow("Camera");
        fireEvent.click(screen.getByRole("button", { name: "New query" }));
        create();

        await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
        const created = onCreated.mock.calls[0][0];
        expect(created).toMatchObject({ types: [fixtureTypes.Camera], watchedAttributes: [] });
        expect(created).not.toHaveProperty("q");
    });

    it("explains what is missing without calling the adapter", async () => {
        const { adapters } = renderWithNgsi(<Editor />);
        const adapterCreate = vi.spyOn(adapters.subscriptions!, "create");
        create();

        expect(
            await screen.findByText(
                "Give the subscription a name. Pick at least one entity type. Give the URI the broker sends notifications to.",
            ),
        ).toBeTruthy();
        expect(nameInput().getAttribute("aria-invalid")).toBe("true");
        expect(adapterCreate).not.toHaveBeenCalled();
    });

    it("shows an adapter failure and keeps the values", async () => {
        const onCreated = vi.fn();
        renderWithNgsi(<Editor defaultValues={completeValues} onCreated={onCreated} />, {
            failOn: ["subscriptions.create"],
        });
        create();

        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(onCreated).not.toHaveBeenCalled();
        expect(nameInput().value).toBe("Camera goes offline");
    });

    it("reports a broker without subscriptions", async () => {
        renderWithNgsi(<Editor defaultValues={completeValues} />, { capabilities: { subscriptions: false } });
        create();

        expect(await screen.findByText("Subscriptions are not supported by this broker.")).toBeTruthy();
    });

    it("wires onCancel to the cancel button", () => {
        const onCancel = vi.fn();
        renderWithNgsi(<Editor onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
