import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { NgsiProvider } from "../../src/runtime/NgsiProvider";
import { createMockNgsiAdapter, type MockAdapterOptions } from "../../src/testing/createMockNgsiAdapter";
import { If } from "../../src/runtime/If";

afterEach(cleanup);

function renderWith(capabilities: MockAdapterOptions["capabilities"], ui: ReactNode) {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <NgsiProvider
                broker={{ id: "test", name: "Test" }}
                adapters={createMockNgsiAdapter(undefined, { capabilities })}
            >
                {ui}
            </NgsiProvider>
        </QueryClientProvider>,
    );
}

describe("Ngsi.If", () => {
    it("renders the children when the capability is present", () => {
        renderWith({}, <If capability="subscriptions">Subscriptions</If>);
        expect(screen.getByText("Subscriptions")).toBeTruthy();
    });

    it("renders nothing when the capability is missing", () => {
        const { container } = renderWith({ temporal: false }, <If capability="temporal">History</If>);
        expect(container.textContent).toBe("");
    });

    it("renders the fallback when the capability is missing", () => {
        renderWith(
            { savedQueries: false },
            <If capability="savedQueries" fallback="No saved queries">
                Saved queries
            </If>,
        );
        expect(screen.getByText("No saved queries")).toBeTruthy();
        expect(screen.queryByText("Saved queries")).toBeNull();
    });

    it("needs every capability in a list", () => {
        renderWith(
            { notifications: false },
            <>
                <If capability={["subscriptions", "temporal"]}>
                    <p>Both</p>
                </If>
                <If capability={["subscriptions", "notifications"]} fallback={<p>Missing one</p>}>
                    <p>Not shown</p>
                </If>
            </>,
        );
        expect(screen.getByText("Both")).toBeTruthy();
        expect(screen.getByText("Missing one")).toBeTruthy();
        expect(screen.queryByText("Not shown")).toBeNull();
    });
});
