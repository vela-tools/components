import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NgsiBrokersProvider } from "../../src/brokers/NgsiBrokersProvider";
import { createMockNgsiAdapter } from "../../src/testing/createMockNgsiAdapter";
import { BrokerConnector } from "../../src/composites/BrokerConnector";

const createAdapters = () => createMockNgsiAdapter();

beforeEach(() => {
    localStorage.clear();
});

afterEach(cleanup);

function renderConnector(contextField?: boolean) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <MantineProvider>
            <QueryClientProvider client={queryClient}>
                <NgsiBrokersProvider
                    defaultBrokers={[{ name: "Den Haag", url: "https://a.example/ngsi-ld/v1" }]}
                    createAdapters={createAdapters}
                >
                    <BrokerConnector contextField={contextField} />
                </NgsiBrokersProvider>
            </QueryClientProvider>
        </MantineProvider>,
    );
}

const card = () => screen.getByRole("button", { name: /Broker ·/ });

async function openDetails() {
    fireEvent.click(card());
    return within(await screen.findByRole("dialog"));
}

describe("BrokerConnector", () => {
    it("shows the selected broker and lists the brokers in its details", async () => {
        renderConnector();
        expect(within(card()).getByText("Den Haag")).toBeTruthy();
        const dialog = await openDetails();
        expect(dialog.getByText("NGSI-LD brokers")).toBeTruthy();
        expect((dialog.getByLabelText("Den Haag") as HTMLInputElement).checked).toBe(true);
        expect((dialog.getByLabelText("Delete Den Haag") as HTMLButtonElement).disabled).toBe(true);
    });

    it("adds a broker and connects to it when selected", async () => {
        renderConnector();
        const dialog = await openDetails();
        fireEvent.click(dialog.getByRole("button", { name: "New broker" }));
        expect((dialog.getByLabelText("Context URL") as HTMLInputElement).value).toBe(
            "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld",
        );
        fireEvent.change(dialog.getByLabelText("Broker name"), { target: { value: "Rotterdam" } });
        fireEvent.change(dialog.getByLabelText("Broker URL"), { target: { value: "https://b.example/ngsi-ld/v1" } });
        fireEvent.click(dialog.getByRole("button", { name: "Save" }));

        fireEvent.click(await dialog.findByLabelText("Rotterdam"));
        await waitFor(() => expect(within(card()).getByText("Rotterdam")).toBeTruthy());
        expect(within(card()).getByText("https://b.example/ngsi-ld/v1")).toBeTruthy();
    });

    it("flags a taken name", async () => {
        renderConnector();
        const dialog = await openDetails();
        fireEvent.click(dialog.getByRole("button", { name: "New broker" }));
        fireEvent.change(dialog.getByLabelText("Broker name"), { target: { value: "Den Haag" } });
        fireEvent.change(dialog.getByLabelText("Broker URL"), { target: { value: "https://b.example" } });
        expect(dialog.getByText("A broker with this name already exists.")).toBeTruthy();
        expect((dialog.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("can leave out the context URL field", async () => {
        renderConnector(false);
        const dialog = await openDetails();
        fireEvent.click(dialog.getByRole("button", { name: "New broker" }));
        expect(dialog.queryByLabelText("Context URL")).toBeNull();
    });
});
