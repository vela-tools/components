import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NgsiProvider } from "../../../src/runtime/NgsiProvider";
import { useNgsiContext } from "../../../src/runtime/ngsiContext";
import { createMockNgsiAdapter } from "../../../src/testing/createMockNgsiAdapter";
import { fixtureTypes } from "../../../src/testing/fixtures";
import { typeKey } from "../../../src/bound/queryBuilder/draft";
import { useQueryDraft, type UseQueryDraftOptions } from "../../../src/bound/queryBuilder/useQueryDraft";

afterEach(cleanup);

function wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
        <QueryClientProvider client={queryClient}>
            <NgsiProvider broker={{ id: "test", name: "Test" }} adapters={createMockNgsiAdapter()}>
                {children}
            </NgsiProvider>
        </QueryClientProvider>
    );
}

function renderDraft(options?: UseQueryDraftOptions) {
    return renderHook(() => ({ draft: useQueryDraft(options), store: useNgsiContext().store }), { wrapper });
}

const camera = typeKey(fixtureTypes.Camera);

describe("useQueryDraft", () => {
    it("starts empty, or from initialQuery", () => {
        expect(renderDraft().result.current.draft.draft).toMatchObject({ typeKeys: [], mode: "builder", geo: null });

        const { result } = renderDraft({ initialQuery: { types: [fixtureTypes.Camera], q: 'status=="faulty"' } });
        expect(result.current.draft.draft.typeKeys).toEqual([camera]);
        expect(result.current.draft.draft.conditions).toMatchObject([
            { property: "status", operator: "==", value: '"faulty"' },
        ]);
    });

    it("loads the broker types", async () => {
        const { result } = renderDraft();
        expect(result.current.draft.typesLoading).toBe(true);
        await waitFor(() => expect(result.current.draft.types.map((t) => t.key)).toContain(camera));
        expect(result.current.draft.knownTypes).toContainEqual(fixtureTypes.Camera);
        expect(result.current.draft.typesLoading).toBe(false);
    });

    it("turns the draft into a query and a preview", async () => {
        const { result } = renderDraft();
        await waitFor(() => expect(result.current.draft.typesLoading).toBe(false));
        const { draft } = result.current.draft;

        act(() =>
            result.current.draft.setDraft({
                ...draft,
                typeKeys: [camera],
                conditions: [{ ...draft.conditions[0], property: "status", operator: "==", value: '"faulty"' }],
            }),
        );

        expect(result.current.draft.toQuery()).toEqual({
            ok: true,
            query: { types: [fixtureTypes.Camera], q: 'status=="faulty"' },
        });
        expect(result.current.draft.preview).toContain('q=status=="faulty"');
    });

    it("reports a text query it cannot parse", async () => {
        const { result } = renderDraft();
        await waitFor(() => expect(result.current.draft.typesLoading).toBe(false));
        act(() => result.current.draft.setDraft((d) => ({ ...d, mode: "text", text: "foo=bar" })));
        expect(result.current.draft.toQuery().ok).toBe(false);
    });

    it("resets to an empty draft", () => {
        const { result } = renderDraft({ initialQuery: { types: [fixtureTypes.Camera] } });
        act(() => result.current.draft.reset());
        expect(result.current.draft.draft).toMatchObject({ typeKeys: [], mode: "builder", text: "", geo: null });
    });

    it("never reads or writes the store", async () => {
        const { result } = renderDraft();
        const { store } = result.current;
        const before = store.getState();
        const setState = vi.spyOn(store, "setState");

        await waitFor(() => expect(result.current.draft.typesLoading).toBe(false));
        act(() => result.current.draft.setDraft((d) => ({ ...d, typeKeys: [camera] })));
        result.current.draft.toQuery();
        act(() => result.current.draft.reset());

        expect(setState).not.toHaveBeenCalled();
        expect(store.getState()).toBe(before);
    });
});
