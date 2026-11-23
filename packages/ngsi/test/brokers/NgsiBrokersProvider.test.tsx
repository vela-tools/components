import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNgsi, useNgsiCommands } from "../../src/hooks/useNgsi";
import { useSelection } from "../../src/hooks/useNgsiSelector";
import { createMockNgsiAdapter } from "../../src/testing/createMockNgsiAdapter";
import type { NgsiBroker, NgsiBrokerInput } from "../../src/brokers/brokers";
import { useNgsiBrokers } from "../../src/brokers/brokersContext";
import { NgsiBrokersProvider } from "../../src/brokers/NgsiBrokersProvider";

const KEY = "test.brokers";
const CAMERA_ID = "urn:ngsi-ld:Camera:camera-1";
const DEFAULTS: NgsiBrokerInput[] = [
    { name: "Den Haag", url: "https://a.example/ngsi-ld/v1", contextUrl: "https://context.example" },
];

let queryClient: QueryClient;
const createAdapters = vi.fn((_broker: NgsiBroker) => createMockNgsiAdapter());

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    createAdapters.mockClear();
    localStorage.clear();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function wrapper({ storageKey, defaults = DEFAULTS }: { storageKey?: string; defaults?: NgsiBrokerInput[] } = {}) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <NgsiBrokersProvider defaultBrokers={defaults} storageKey={storageKey} createAdapters={createAdapters}>
                    {children}
                </NgsiBrokersProvider>
            </QueryClientProvider>
        );
    };
}

const useAll = () => ({
    brokers: useNgsiBrokers(),
    ngsi: useNgsi(),
    selection: useSelection(),
    commands: useNgsiCommands(),
});

describe("NgsiBrokersProvider", () => {
    it("connects the runtime to the first default broker", () => {
        const { result } = renderHook(useAll, { wrapper: wrapper() });
        expect(result.current.brokers.selected).toEqual({ id: "default-0", ...DEFAULTS[0] });
        expect(result.current.ngsi.broker).toEqual({
            id: "https://a.example/ngsi-ld/v1|https://context.example",
            name: "Den Haag",
            url: "https://a.example/ngsi-ld/v1",
        });
        expect(createAdapters).toHaveBeenLastCalledWith(result.current.brokers.selected);
    });

    it("throws without default brokers", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderHook(useAll, { wrapper: wrapper({ defaults: [] }) })).toThrow("at least one default broker");
    });

    it("adds and selects a broker, and starts a fresh selection for it", () => {
        const { result } = renderHook(useAll, { wrapper: wrapper() });
        act(() => {
            result.current.commands.selectEntity(CAMERA_ID);
        });
        expect(result.current.selection.entityId).toBe(CAMERA_ID);

        let added: ReturnType<typeof result.current.brokers.commands.save> | undefined;
        act(() => {
            added = result.current.brokers.commands.save({ name: " Rotterdam ", url: "https://b.example " });
        });
        expect(added).toMatchObject({ ok: true, broker: { name: "Rotterdam", url: "https://b.example" } });
        expect(result.current.brokers.brokers).toHaveLength(2);
        expect(result.current.selection.entityId).toBe(CAMERA_ID);

        const id = added!.ok ? added!.broker.id : "";
        act(() => {
            expect(result.current.brokers.commands.select(id)).toEqual({ ok: true });
        });
        expect(result.current.ngsi.broker.name).toBe("Rotterdam");
        expect(result.current.selection.entityId).toBeNull();
        expect(createAdapters).toHaveBeenLastCalledWith(expect.objectContaining({ id, name: "Rotterdam" }));
    });

    it("rejects blank fields, a taken name and unknown ids", () => {
        const { result } = renderHook(useAll, { wrapper: wrapper() });
        const { commands } = result.current.brokers;
        expect(commands.save({ name: " ", url: "https://b.example" })).toEqual({ ok: false, reason: "blank-name" });
        expect(commands.save({ name: "B", url: "" })).toEqual({ ok: false, reason: "blank-url" });
        expect(commands.save({ name: "Den Haag", url: "https://b.example" })).toEqual({
            ok: false,
            reason: "name-taken",
        });
        expect(commands.save({ name: "B", url: "https://b.example" }, "nope")).toEqual({
            ok: false,
            reason: "broker-not-found",
        });
        expect(commands.select("nope")).toEqual({ ok: false, reason: "broker-not-found" });
        expect(commands.remove("nope")).toEqual({ ok: false, reason: "broker-not-found" });
        expect(result.current.brokers.brokers).toHaveLength(1);
    });

    it("edits a broker, keeping its own name allowed", () => {
        const { result } = renderHook(useAll, { wrapper: wrapper() });
        act(() => {
            expect(
                result.current.brokers.commands.save(
                    { name: "Den Haag", url: "https://c.example", contextUrl: "" },
                    "default-0",
                ),
            ).toMatchObject({ ok: true });
        });
        expect(result.current.brokers.selected).toEqual({
            id: "default-0",
            name: "Den Haag",
            url: "https://c.example",
        });
        expect(result.current.ngsi.broker.id).toBe("https://c.example|");
    });

    it("never removes the last broker, and selects another when the selected one is removed", () => {
        const { result } = renderHook(useAll, { wrapper: wrapper() });
        expect(result.current.brokers.commands.remove("default-0")).toEqual({ ok: false, reason: "last-broker" });

        let id = "";
        act(() => {
            const added = result.current.brokers.commands.save({ name: "Rotterdam", url: "https://b.example" });
            id = added.ok ? added.broker.id : "";
        });
        act(() => {
            expect(result.current.brokers.commands.remove("default-0")).toEqual({ ok: true });
        });
        expect(result.current.brokers.brokers.map((b) => b.id)).toEqual([id]);
        expect(result.current.brokers.selected.id).toBe(id);
    });

    it("keeps the brokers in localStorage when a storage key is given", () => {
        const first = renderHook(useAll, { wrapper: wrapper({ storageKey: KEY }) });
        act(() => {
            const added = first.result.current.brokers.commands.save({ name: "Rotterdam", url: "https://b.example" });
            if (added.ok) first.result.current.brokers.commands.select(added.broker.id);
        });
        first.unmount();

        const second = renderHook(useAll, { wrapper: wrapper({ storageKey: KEY }) });
        expect(second.result.current.brokers.brokers.map((b) => b.name)).toEqual(["Den Haag", "Rotterdam"]);
        expect(second.result.current.brokers.selected.name).toBe("Rotterdam");
    });

    it("does not touch localStorage without a storage key", () => {
        const { result } = renderHook(useAll, { wrapper: wrapper() });
        act(() => {
            result.current.brokers.commands.save({ name: "Rotterdam", url: "https://b.example" });
        });
        expect(localStorage.length).toBe(0);
    });

    it("falls back to the defaults when the stored value is unusable", () => {
        localStorage.setItem(KEY, JSON.stringify({ brokers: [{ id: 1, name: "Bad" }], selectedId: 1 }));
        const { result } = renderHook(useAll, { wrapper: wrapper({ storageKey: KEY }) });
        expect(result.current.brokers.brokers.map((b) => b.name)).toEqual(["Den Haag"]);

        localStorage.setItem(KEY, "{not json");
        const again = renderHook(useAll, { wrapper: wrapper({ storageKey: KEY }) });
        expect(again.result.current.brokers.brokers.map((b) => b.name)).toEqual(["Den Haag"]);
    });

    it("reports when the brokers cannot be stored", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("quota");
        });
        const { result } = renderHook(useAll, { wrapper: wrapper({ storageKey: KEY }) });
        expect(result.current.brokers.storageFailed).toBe(false);
        act(() => {
            result.current.brokers.commands.save({ name: "Rotterdam", url: "https://b.example" });
        });
        expect(result.current.brokers.storageFailed).toBe(true);
        expect(result.current.brokers.brokers).toHaveLength(2);
    });
});
