import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NgsiAdapters } from "../../src/adapters";
import { NgsiProvider } from "../../src/runtime/NgsiProvider";
import { ngsiKeys } from "../../src/runtime/queryKeys";
import { createMockNgsiAdapter, MockAdapterError } from "../../src/testing/createMockNgsiAdapter";
import { fixtureNotifications, fixtureSubscriptions } from "../../src/testing/fixtures";
import { useNgsiCommands } from "../../src/hooks/useNgsi";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useSubscriptions } from "../../src/hooks/useSubscriptions";

const BROKER = { id: "test", name: "Test" };
const CROWD_HIGH = "urn:ngsi-ld:Subscription:crowd-high";
const CAMERA_FAULTY = "urn:ngsi-ld:Subscription:camera-faulty";

let queryClient: QueryClient;

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(cleanup);

function wrapper(adapters: NgsiAdapters) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={BROKER} adapters={adapters}>
                    {children}
                </NgsiProvider>
            </QueryClientProvider>
        );
    };
}

const ids = (list: { id: string }[] | undefined) => list?.map((x) => x.id);

describe("useSubscriptions", () => {
    it("lists the subscriptions from the adapter", async () => {
        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(createMockNgsiAdapter()) });

        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(result.current.data).toEqual(fixtureSubscriptions);
    });

    it("caches the list under the broker’s subscriptions key", async () => {
        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(createMockNgsiAdapter()) });

        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(queryClient.getQueryData(ngsiKeys.subscriptions(BROKER.id))).toEqual(fixtureSubscriptions);
    });

    it("reports an adapter failure as error state", async () => {
        const adapters = createMockNgsiAdapter(undefined, { failOn: ["subscriptions.list"] });
        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(adapters) });

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.error).toBeInstanceOf(MockAdapterError);
        expect(result.current.data).toBeUndefined();
    });

    it("stays idle without a subscriptions adapter", async () => {
        const adapters = createMockNgsiAdapter(undefined, { capabilities: { subscriptions: false } });
        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(adapters) });

        await act(() => Promise.resolve());
        expect(result.current.status).toBe("pending");
        expect(result.current.fetchStatus).toBe("idle");
    });

    it("refetches after refresh()", async () => {
        const adapters = createMockNgsiAdapter();
        const list = vi.spyOn(adapters.subscriptions!, "list");
        const { result } = renderHook(() => ({ subs: useSubscriptions(), commands: useNgsiCommands() }), {
            wrapper: wrapper(adapters),
        });
        await waitFor(() => expect(result.current.subs.status).toBe("success"));

        act(() => {
            result.current.commands.refresh();
        });

        await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    });
});

describe("useNotifications", () => {
    it("lists every notification, newest first, without a query", async () => {
        const { result } = renderHook(() => useNotifications(), { wrapper: wrapper(createMockNgsiAdapter()) });

        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(ids(result.current.data)).toEqual([
            "urn:ngsi-ld:Notification:3",
            "urn:ngsi-ld:Notification:2",
            "urn:ngsi-ld:Notification:1",
        ]);
    });

    it("passes subscriptionId and limit to the adapter", async () => {
        const adapters = createMockNgsiAdapter();
        const list = vi.spyOn(adapters.notifications!, "list");
        const { result } = renderHook(() => useNotifications({ subscriptionId: CROWD_HIGH, limit: 2 }), {
            wrapper: wrapper(adapters),
        });

        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(list).toHaveBeenCalledWith(
            { subscriptionId: CROWD_HIGH, limit: 2 },
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(ids(result.current.data)).toEqual(["urn:ngsi-ld:Notification:3", "urn:ngsi-ld:Notification:2"]);
    });

    it("returns an empty list for a subscription without notifications", async () => {
        const { result } = renderHook(() => useNotifications({ subscriptionId: CAMERA_FAULTY }), {
            wrapper: wrapper(createMockNgsiAdapter()),
        });

        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(result.current.data).toEqual([]);
    });

    it("caches each query separately under the notification lists key", async () => {
        const adapters = createMockNgsiAdapter();
        const all = renderHook(() => useNotifications(), { wrapper: wrapper(adapters) });
        const one = renderHook(() => useNotifications({ subscriptionId: CROWD_HIGH, limit: 1 }), {
            wrapper: wrapper(adapters),
        });
        await waitFor(() => expect(all.result.current.status).toBe("success"));
        await waitFor(() => expect(one.result.current.status).toBe("success"));

        const cached = queryClient.getQueriesData({ queryKey: ngsiKeys.notificationLists(BROKER.id) });
        expect(cached).toHaveLength(2);
        expect(queryClient.getQueryData(ngsiKeys.notifications(BROKER.id, {}))).toHaveLength(
            fixtureNotifications.length,
        );
    });

    it("keeps showing the previous list while a new query loads", async () => {
        const adapters = createMockNgsiAdapter(undefined, { latencyMs: 20 });
        const { result, rerender } = renderHook(
            ({ subscriptionId }: { subscriptionId?: string }) => useNotifications({ subscriptionId }),
            { wrapper: wrapper(adapters), initialProps: {} },
        );
        await waitFor(() => expect(result.current.status).toBe("success"));
        const previous = result.current.data;

        rerender({ subscriptionId: CAMERA_FAULTY });

        expect(result.current.isPlaceholderData).toBe(true);
        expect(result.current.data).toBe(previous);
        await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
        expect(result.current.data).toEqual([]);
    });

    it("reports an adapter failure as error state", async () => {
        const adapters = createMockNgsiAdapter(undefined, { failOn: ["notifications.list"] });
        const { result } = renderHook(() => useNotifications(), { wrapper: wrapper(adapters) });

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.error).toBeInstanceOf(MockAdapterError);
    });

    it("stays idle without a notifications adapter", async () => {
        const adapters = createMockNgsiAdapter(undefined, { capabilities: { notifications: false } });
        const { result } = renderHook(() => useNotifications(), { wrapper: wrapper(adapters) });

        await act(() => Promise.resolve());
        expect(result.current.status).toBe("pending");
        expect(result.current.fetchStatus).toBe("idle");
    });
});
