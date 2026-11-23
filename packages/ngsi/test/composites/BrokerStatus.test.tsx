import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NgsiAdapters } from "../../src/adapters";
import { useNgsiCommands } from "../../src/hooks/useNgsi";
import { NgsiProvider, type BrokerInfo } from "../../src/runtime/NgsiProvider";
import { createMockNgsiAdapter, type MockAdapterOptions } from "../../src/testing/createMockNgsiAdapter";
import { BrokerStatus } from "../../src/composites/BrokerStatus";

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
});

let queryClient: QueryClient;

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(cleanup);

const broker: BrokerInfo = { id: "test", name: "Den Haag", url: "https://broker.example/ngsi-ld/v1" };

function Broker({
    info = broker,
    adapters,
    children,
}: {
    info?: BrokerInfo;
    adapters: NgsiAdapters;
    children: ReactNode;
}) {
    return (
        <NgsiProvider broker={info} adapters={adapters}>
            {children}
        </NgsiProvider>
    );
}

function renderStatus(ui: ReactNode) {
    return render(
        <MantineProvider>
            <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </MantineProvider>,
    );
}

const statusOf = (name: string) => screen.getByText(name).closest("[data-status]")?.getAttribute("data-status");

describe("BrokerStatus", () => {
    it("shows the broker name and URL, connecting until the types load", async () => {
        const options: MockAdapterOptions = { latencyMs: 30 };
        renderStatus(
            <Broker adapters={createMockNgsiAdapter(undefined, options)}>
                <BrokerStatus />
            </Broker>,
        );
        expect(screen.getByText("Den Haag")).toBeTruthy();
        expect(screen.getByText("https://broker.example/ngsi-ld/v1")).toBeTruthy();
        expect(screen.getByRole("status").textContent).toContain("connecting");
        expect(statusOf("Den Haag")).toBe("connecting");

        await waitFor(() => expect(statusOf("Den Haag")).toBe("connected"));
        expect(screen.getByRole("status").textContent).toContain("connected");
    });

    it("shows an error, with the message on hover, when the broker fails", async () => {
        renderStatus(
            <Broker adapters={createMockNgsiAdapter(undefined, { failOn: ["entities.listTypes"] })}>
                <BrokerStatus />
            </Broker>,
        );
        await waitFor(() => expect(statusOf("Den Haag")).toBe("error"));
        expect(screen.getByRole("status").textContent).toContain("unreachable");

        fireEvent.mouseEnter(screen.getByText("Den Haag").closest("[data-status]") as HTMLElement);
        expect(await screen.findByText(/entities\.listTypes: failed/)).toBeTruthy();
    });

    it("goes back to connected after a refresh once the broker answers again", async () => {
        let down = true;
        function Refresh() {
            const { refresh } = useNgsiCommands();
            return <button onClick={() => refresh("types")}>Refresh</button>;
        }
        renderStatus(
            <Broker
                adapters={createMockNgsiAdapter(undefined, {
                    failOn: (method) => down && method === "entities.listTypes",
                })}
            >
                <BrokerStatus />
                <Refresh />
            </Broker>,
        );
        await waitFor(() => expect(statusOf("Den Haag")).toBe("error"));

        down = false;
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        await waitFor(() => expect(statusOf("Den Haag")).toBe("connected"));
    });

    it("shows each provider its own broker", async () => {
        renderStatus(
            <>
                <Broker adapters={createMockNgsiAdapter()}>
                    <BrokerStatus />
                </Broker>
                <Broker
                    info={{ id: "other", name: "Rotterdam" }}
                    adapters={createMockNgsiAdapter(undefined, { failOn: ["entities.listTypes"] })}
                >
                    <BrokerStatus />
                </Broker>
            </>,
        );
        await waitFor(() => {
            expect(statusOf("Den Haag")).toBe("connected");
            expect(statusOf("Rotterdam")).toBe("error");
        });
    });

    it("opens the details in a modal only when they are given", async () => {
        const { unmount } = renderStatus(
            <Broker adapters={createMockNgsiAdapter()}>
                <BrokerStatus />
            </Broker>,
        );
        expect(screen.queryByRole("button")).toBeNull();
        unmount();

        renderStatus(
            <Broker adapters={createMockNgsiAdapter()}>
                <BrokerStatus details={<p>Broker config</p>} />
            </Broker>,
        );
        fireEvent.click(screen.getByRole("button"));
        expect(await screen.findByText("Broker config")).toBeTruthy();
    });
});
