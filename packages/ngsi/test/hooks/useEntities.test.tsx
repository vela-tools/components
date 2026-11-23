import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EntitySource, NgsiAdapters } from "../../src/adapters";
import { NgsiProvider } from "../../src/runtime/NgsiProvider";
import { createMockNgsiAdapter } from "../../src/testing/createMockNgsiAdapter";
import { fixtureEntities, fixtureTypes } from "../../src/testing/fixtures";
import type { EntityQuery, NgsiLdEntity } from "../../src/types";
import { useActiveQuery } from "../../src/hooks/useActiveQuery";
import { useEntities } from "../../src/hooks/useEntities";
import { useNgsiCommands } from "../../src/hooks/useNgsi";

type Result = { entities: NgsiLdEntity[]; total?: number };

type PendingCall = {
    query: EntityQuery;
    signal: AbortSignal | undefined;
    resolve: (result: Result) => void;
    reject: (error: Error) => void;
};

const QUERY_A: EntityQuery = { types: [fixtureTypes.Camera] };
const QUERY_B: EntityQuery = { types: [fixtureTypes.OSMPlace] };
const RESULT_A: Result = { entities: fixtureEntities.filter((e) => e.type === "Camera") };
const RESULT_B: Result = { entities: fixtureEntities.filter((e) => e.type === "OSMPlace") };

let queryClient: QueryClient;
let calls: PendingCall[];
let adapters: NgsiAdapters;

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    calls = [];
    const mock = createMockNgsiAdapter();
    const entities: EntitySource = {
        ...mock.entities,
        queryEntities: (query, opts) =>
            new Promise<Result>((resolve, reject) => {
                calls.push({ query, signal: opts?.signal, resolve, reject });
            }),
    };
    adapters = { ...mock, entities };
});

afterEach(cleanup);

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <NgsiProvider broker={{ id: "test", name: "Test" }} adapters={adapters}>
                {children}
            </NgsiProvider>
        </QueryClientProvider>
    );
}

const callFor = (query: EntityQuery) => {
    const call = calls.find((c) => JSON.stringify(c.query) === JSON.stringify(query));
    if (!call) throw new Error(`no queryEntities call for ${JSON.stringify(query)}`);
    return call;
};

function renderEntities() {
    return renderHook(() => ({ entities: useEntities(), active: useActiveQuery(), commands: useNgsiCommands() }), {
        wrapper: Wrapper,
    });
}

describe("useActiveQuery", () => {
    it("follows setQuery and setGeoFilter", () => {
        const { result } = renderEntities();
        expect(result.current.active).toEqual({});

        const geo = { lat: 52.08, lon: 4.31, radiusKm: 2 };
        act(() => {
            result.current.commands.setQuery({ ...QUERY_A, q: 'status=="on"' });
        });
        expect(result.current.active).toEqual({ ...QUERY_A, q: 'status=="on"' });

        act(() => {
            result.current.commands.setGeoFilter(geo);
        });
        expect(result.current.active).toEqual({ ...QUERY_A, q: 'status=="on"', geo });
    });
});

describe("useEntities when the query changes while one is in flight", () => {
    it("ends with the new query’s result when the old one answers last", async () => {
        const { result } = renderEntities();
        act(() => {
            result.current.commands.setQuery(QUERY_A);
        });
        await waitFor(() => expect(calls.map((c) => c.query)).toContainEqual(QUERY_A));

        act(() => {
            result.current.commands.setQuery(QUERY_B);
        });
        await waitFor(() => expect(calls.map((c) => c.query)).toContainEqual(QUERY_B));

        await act(async () => {
            callFor(QUERY_B).resolve(RESULT_B);
        });
        await waitFor(() => expect(result.current.entities.data).toEqual(RESULT_B));

        await act(async () => {
            callFor(QUERY_A).resolve(RESULT_A);
        });
        expect(result.current.entities.data).toEqual(RESULT_B);
        expect(result.current.active).toEqual(QUERY_B);
    });

    it("cancels the superseded request through its signal", async () => {
        const { result } = renderEntities();
        act(() => {
            result.current.commands.setQuery(QUERY_A);
        });
        await waitFor(() => expect(calls.map((c) => c.query)).toContainEqual(QUERY_A));

        act(() => {
            result.current.commands.setQuery(QUERY_B);
        });
        await waitFor(() => expect(callFor(QUERY_A).signal?.aborted).toBe(true));
        expect(callFor(QUERY_B).signal?.aborted).toBe(false);
    });

    it("reports the new query’s failure as error state and keeps it active", async () => {
        const { result } = renderEntities();
        act(() => {
            result.current.commands.setQuery(QUERY_A);
        });
        await waitFor(() => expect(calls.map((c) => c.query)).toContainEqual(QUERY_A));
        await act(async () => {
            callFor(QUERY_A).resolve(RESULT_A);
        });
        await waitFor(() => expect(result.current.entities.data).toEqual(RESULT_A));

        act(() => {
            result.current.commands.setQuery(QUERY_B);
        });
        await waitFor(() => expect(calls.map((c) => c.query)).toContainEqual(QUERY_B));
        await act(async () => {
            callFor(QUERY_B).reject(new Error("broker down"));
        });

        await waitFor(() => expect(result.current.entities.status).toBe("error"));
        expect(result.current.entities.error).toEqual(new Error("broker down"));
        expect(result.current.active).toEqual(QUERY_B);
        expect(result.current.entities.isPlaceholderData).toBe(false);
    });
});
