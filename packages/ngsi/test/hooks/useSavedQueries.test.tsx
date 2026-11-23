import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NgsiAdapters } from "../../src/adapters";
import { NgsiProvider } from "../../src/runtime/NgsiProvider";
import { createMockNgsiAdapter } from "../../src/testing/createMockNgsiAdapter";
import { fixtureSavedQueries } from "../../src/testing/fixtures";
import { useNgsiCommands } from "../../src/hooks/useNgsi";
import { useSavedQueries } from "../../src/hooks/useSavedQueries";

let queryClient: QueryClient;

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(cleanup);

function wrapper(adapters: NgsiAdapters) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={{ id: "test", name: "Test" }} adapters={adapters}>
                    {children}
                </NgsiProvider>
            </QueryClientProvider>
        );
    };
}

describe("useSavedQueries", () => {
    it("loads the saved queries and reloads them after a save", async () => {
        const { result } = renderHook(() => ({ list: useSavedQueries(), commands: useNgsiCommands() }), {
            wrapper: wrapper(createMockNgsiAdapter()),
        });
        await waitFor(() => expect(result.current.list.data).toEqual(fixtureSavedQueries));

        await act(() => result.current.commands.savedQueries.save({ name: "Cameras", query: {} }));
        await waitFor(() => expect(result.current.list.data?.map((q) => q.name)).toContain("Cameras"));
    });

    it("stays idle without a saved query store", () => {
        const { result } = renderHook(() => useSavedQueries(), {
            wrapper: wrapper(createMockNgsiAdapter(undefined, { capabilities: { savedQueries: false } })),
        });
        expect(result.current.fetchStatus).toBe("idle");
        expect(result.current.data).toBeUndefined();
    });
});
