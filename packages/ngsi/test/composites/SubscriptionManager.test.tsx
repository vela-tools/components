import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NgsiAdapters } from "../../src/adapters";
import { NgsiProvider } from "../../src/runtime/NgsiProvider";
import { createMockNgsiAdapter, type MockAdapterOptions } from "../../src/testing/createMockNgsiAdapter";
import { fixtureTypes } from "../../src/testing/fixtures";
import { SubscriptionManager, type SubscriptionManagerProps } from "../../src/composites/SubscriptionManager";

beforeAll(() => {
    window.matchMedia ??= ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

let queryClient: QueryClient;
let adapters: NgsiAdapters;

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(cleanup);

function renderManager(options: MockAdapterOptions = {}, props: Partial<SubscriptionManagerProps> = {}) {
    adapters = createMockNgsiAdapter(undefined, options);
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <MantineProvider>
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={{ id: "test", name: "Test" }} adapters={adapters}>
                    {children}
                </NgsiProvider>
            </QueryClientProvider>
        </MantineProvider>
    );
    return render(<SubscriptionManager {...props} />, { wrapper: Wrapper });
}

const subscriptionsTable = () => within(screen.getAllByRole("table")[0]);

const findSubscription = (name: string) => waitFor(() => subscriptionsTable().getByText(name));

const subscriptionRow = (name: string) => subscriptionsTable().getByText(name).closest("tr") as HTMLElement;

const completeValues = {
    name: "Camera goes offline",
    types: [fixtureTypes.Camera],
    q: 'status=="offline"',
    endpoint: { uri: "https://hook.example/notify" },
};

describe("SubscriptionManager", () => {
    it("renders the fallback without a subscriptions adapter", () => {
        renderManager({ capabilities: { subscriptions: false } }, { fallback: <p>Not supported</p> });

        expect(screen.getByText("Not supported")).toBeTruthy();
        expect(screen.queryByText("Subscriptions")).toBeNull();
    });

    it("lists subscriptions and notifications from the adapters", async () => {
        renderManager();

        expect(await findSubscription("Crowd flow above 100 people")).toBeTruthy();
        expect(subscriptionsTable().getByText("Camera reports a fault")).toBeTruthy();
        expect(await screen.findAllByText('{"peopleCount":104}')).toHaveLength(1);
    });

    it("hides the notifications without a notifications adapter", async () => {
        renderManager({ capabilities: { notifications: false } });

        await findSubscription("Crowd flow above 100 people");
        expect(screen.queryByText("Notifications")).toBeNull();
    });

    it("filters notifications to the selected subscription and back", async () => {
        renderManager();
        await screen.findByText('{"peopleCount":104}');

        fireEvent.click(subscriptionRow("Camera reports a fault"));

        expect(await screen.findByText("Notifications: Camera reports a fault")).toBeTruthy();
        await waitFor(() => expect(screen.getByText("No notifications")).toBeTruthy());

        fireEvent.click(screen.getByRole("button", { name: "Show all" }));
        expect(await screen.findByText('{"peopleCount":104}')).toBeTruthy();
    });

    it("pauses an active subscription through the command", async () => {
        renderManager();
        await findSubscription("Crowd flow above 100 people");
        const setStatus = vi.spyOn(adapters.subscriptions!, "setStatus");

        fireEvent.click(within(subscriptionRow("Crowd flow above 100 people")).getByRole("button", { name: "Pause" }));

        await waitFor(() =>
            expect(
                within(subscriptionRow("Crowd flow above 100 people")).getByRole("button", { name: "Activate" }),
            ).toBeTruthy(),
        );
        expect(setStatus).toHaveBeenCalledWith("urn:ngsi-ld:Subscription:crowd-high", "paused");
    });

    it("edits a subscription from its row and closes the editor after saving", async () => {
        const onUpdated = vi.fn();
        renderManager({}, { onUpdated });
        await findSubscription("Camera reports a fault");

        fireEvent.click(within(subscriptionRow("Camera reports a fault")).getByRole("button", { name: "Edit" }));
        fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), { target: { value: "Camera broken" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ name: "Camera broken" })));
        expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
        expect(await findSubscription("Camera broken")).toBeTruthy();
    });

    it("removes a subscription", async () => {
        renderManager();
        await findSubscription("Camera reports a fault");

        fireEvent.click(within(subscriptionRow("Camera reports a fault")).getByRole("button", { name: "Remove" }));
        fireEvent.click(await screen.findByRole("button", { name: "Remove subscription" }));

        await waitFor(() => expect(subscriptionsTable().queryByText("Camera reports a fault")).toBeNull());
    });

    it("shows an adapter failure and keeps the list usable", async () => {
        renderManager({ failOn: ["subscriptions.remove"] });
        await findSubscription("Camera reports a fault");

        fireEvent.click(within(subscriptionRow("Camera reports a fault")).getByRole("button", { name: "Remove" }));
        fireEvent.click(await screen.findByRole("button", { name: "Remove subscription" }));

        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(subscriptionsTable().getByText("Camera reports a fault")).toBeTruthy();
    });

    it("rejects an incomplete draft without calling the adapter", async () => {
        renderManager();
        await findSubscription("Crowd flow above 100 people");
        const create = vi.spyOn(adapters.subscriptions!, "create");

        fireEvent.click(screen.getByRole("button", { name: "New subscription" }));
        fireEvent.click(screen.getByRole("button", { name: "Create" }));

        expect(
            await screen.findByText(
                "Give the subscription a name. Pick at least one entity type. Give the URI the broker sends notifications to.",
            ),
        ).toBeTruthy();
        expect(create).not.toHaveBeenCalled();
    });

    it("creates a subscription from the editor, closes it and reports it", async () => {
        const onCreated = vi.fn();
        renderManager({}, { defaultValues: completeValues, onCreated });
        await findSubscription("Crowd flow above 100 people");

        fireEvent.click(screen.getByRole("button", { name: "New subscription" }));
        fireEvent.click(screen.getByRole("button", { name: "Create" }));

        expect(await findSubscription("Camera goes offline")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
        expect(onCreated).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Camera goes offline",
                q: 'status=="offline"',
                watchedAttributes: ["status"],
            }),
        );
    });

    it("closes the editor on cancel", async () => {
        renderManager();
        await findSubscription("Crowd flow above 100 people");

        fireEvent.click(screen.getByRole("button", { name: "New subscription" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
    });

    it("keeps the selected subscription separate for two managers under one provider", async () => {
        adapters = createMockNgsiAdapter();
        render(
            <MantineProvider>
                <QueryClientProvider client={queryClient}>
                    <NgsiProvider broker={{ id: "test", name: "Test" }} adapters={adapters}>
                        <section aria-label="first">
                            <SubscriptionManager />
                        </section>
                        <section aria-label="second">
                            <SubscriptionManager />
                        </section>
                    </NgsiProvider>
                </QueryClientProvider>
            </MantineProvider>,
        );
        const first = within(screen.getByRole("region", { name: "first" }));
        const second = within(screen.getByRole("region", { name: "second" }));
        await waitFor(() => expect(second.getAllByText("Camera reports a fault").length).toBeGreaterThan(0));

        fireEvent.click(within(first.getAllByRole("table")[0]).getByText("Camera reports a fault").closest("tr")!);

        expect(await first.findByText("Notifications: Camera reports a fault")).toBeTruthy();
        expect(second.getByText("Notifications")).toBeTruthy();
        expect(second.queryByText("Notifications: Camera reports a fault")).toBeNull();
    });
});
