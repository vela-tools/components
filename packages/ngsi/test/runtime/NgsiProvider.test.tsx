import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NgsiAdapters } from "../../src/adapters";
import { useEntities } from "../../src/hooks/useEntities";
import { useCapabilities, useNgsiCommands } from "../../src/hooks/useNgsi";
import { useNgsiSelector, useSelection } from "../../src/hooks/useNgsiSelector";
import { createMockNgsiAdapter } from "../../src/testing/createMockNgsiAdapter";
import type { NgsiCommands } from "../../src/runtime/commands";
import { NgsiProvider } from "../../src/runtime/NgsiProvider";
import { ngsiKeys } from "../../src/runtime/queryKeys";

const BROKER = { id: "test", name: "Test" };
const CAMERA_ID = "urn:ngsi-ld:Camera:camera-1";
const adapters = createMockNgsiAdapter();

let queryClient: QueryClient;

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(cleanup);

function wrapper(adapterSet: NgsiAdapters = adapters) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={BROKER} adapters={adapterSet}>
                    {children}
                </NgsiProvider>
            </QueryClientProvider>
        );
    };
}

const loadEntity = (id: string) =>
    queryClient.fetchQuery({
        queryKey: ngsiKeys.entity(BROKER.id, id),
        queryFn: () => adapters.entities.getEntity(id),
    });

describe("useNgsiCommands", () => {
    it("lets a second command in the same handler see the first one’s update", async () => {
        await loadEntity(CAMERA_ID);
        const { result } = renderHook(() => ({ commands: useNgsiCommands(), selection: useSelection() }), {
            wrapper: wrapper(),
        });

        let attributeResult: ReturnType<NgsiCommands["selectAttribute"]> | undefined;
        act(() => {
            result.current.commands.selectEntity(CAMERA_ID);
            attributeResult = result.current.commands.selectAttribute("status");
        });

        expect(attributeResult).toEqual({ ok: true });
        expect(result.current.selection.entityId).toBe(CAMERA_ID);
        expect(result.current.selection.attribute).toBe("status");
    });

    it("returns the same commands across selection changes", () => {
        const { result } = renderHook(() => ({ commands: useNgsiCommands(), selection: useSelection() }), {
            wrapper: wrapper(),
        });
        const before = result.current.commands;

        act(() => {
            result.current.commands.selectEntity(CAMERA_ID);
        });

        expect(result.current.selection.entityId).toBe(CAMERA_ID);
        expect(result.current.commands).toBe(before);
    });
});

describe("useNgsiSelector", () => {
    it("does not re-render an EntityList-style consumer when only the attribute changes", async () => {
        await loadEntity(CAMERA_ID);
        let renders = 0;
        let commands: NgsiCommands | undefined;
        let status = "";

        function EntityListProbe() {
            renders++;
            const result = useEntities();
            useNgsiSelector((s) => s.entityId);
            status = result.status;
            return null;
        }

        function Commands() {
            commands = useNgsiCommands();
            return null;
        }

        const Wrapper = wrapper();
        render(
            <Wrapper>
                <EntityListProbe />
                <Commands />
            </Wrapper>,
        );
        await waitFor(() => expect(status).toBe("success"));

        act(() => {
            commands!.selectEntity(CAMERA_ID);
        });
        const afterEntity = renders;

        act(() => {
            expect(commands!.selectAttribute("status")).toEqual({ ok: true });
        });
        expect(renders).toBe(afterEntity);

        act(() => {
            commands!.selectAttribute(null);
        });
        expect(renders).toBe(afterEntity);
    });

    it("re-renders when the selected field changes", () => {
        const { result } = renderHook(
            () => ({ entityId: useNgsiSelector((s) => s.entityId), commands: useNgsiCommands() }),
            { wrapper: wrapper() },
        );

        act(() => {
            result.current.commands.selectEntity(CAMERA_ID);
        });

        expect(result.current.entityId).toBe(CAMERA_ID);
    });

    it("keeps a derived value stable when isEqual says it did not change", () => {
        let renders = 0;
        const sameIds = (a: { id: string | null }, b: { id: string | null }) => a.id === b.id;
        const { result } = renderHook(
            () => {
                renders++;
                return {
                    derived: useNgsiSelector((s) => ({ id: s.entityId }), sameIds),
                    commands: useNgsiCommands(),
                };
            },
            { wrapper: wrapper() },
        );
        const first = result.current.derived;
        const rendersBefore = renders;

        act(() => {
            expect(result.current.commands.selectTypes([{ type: "Camera" }])).toEqual({ ok: true });
        });

        expect(result.current.derived).toBe(first);
        expect(renders).toBe(rendersBefore);
    });
});

describe("NgsiProvider", () => {
    it("keeps separate selections for side-by-side providers", () => {
        const selections: Record<string, ReturnType<typeof useSelection>> = {};
        const commands: Record<string, NgsiCommands> = {};

        function Probe({ name }: { name: string }) {
            selections[name] = useSelection();
            commands[name] = useNgsiCommands();
            return null;
        }

        render(
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={{ id: "a", name: "A" }} adapters={adapters}>
                    <Probe name="a" />
                </NgsiProvider>
                <NgsiProvider broker={{ id: "b", name: "B" }} adapters={adapters}>
                    <Probe name="b" />
                </NgsiProvider>
            </QueryClientProvider>,
        );

        act(() => {
            commands.a.selectEntity(CAMERA_ID);
        });

        expect(selections.a.entityId).toBe(CAMERA_ID);
        expect(selections.b.entityId).toBeNull();
        expect(commands.a).not.toBe(commands.b);
    });

    it("gives a nested provider its own selection", () => {
        const selections: Record<string, ReturnType<typeof useSelection>> = {};
        const commands: Record<string, NgsiCommands> = {};

        function Probe({ name }: { name: string }) {
            selections[name] = useSelection();
            commands[name] = useNgsiCommands();
            return null;
        }

        render(
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={{ id: "outer", name: "Outer" }} adapters={adapters}>
                    <Probe name="outer" />
                    <NgsiProvider broker={{ id: "inner", name: "Inner" }} adapters={adapters}>
                        <Probe name="inner" />
                    </NgsiProvider>
                </NgsiProvider>
            </QueryClientProvider>,
        );

        act(() => {
            commands.inner.selectEntity(CAMERA_ID);
        });

        expect(selections.inner.entityId).toBe(CAMERA_ID);
        expect(selections.outer.entityId).toBeNull();
    });

    it("starts a fresh selection when the broker id changes", () => {
        let selection: ReturnType<typeof useSelection> | undefined;
        let commands: NgsiCommands | undefined;

        function Probe() {
            selection = useSelection();
            commands = useNgsiCommands();
            return null;
        }

        const tree = (id: string) => (
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={{ id, name: id }} adapters={adapters}>
                    <Probe />
                </NgsiProvider>
            </QueryClientProvider>
        );

        const { rerender } = render(tree("a"));
        act(() => {
            commands!.selectEntity(CAMERA_ID);
        });
        expect(selection!.entityId).toBe(CAMERA_ID);

        rerender(tree("a"));
        expect(selection!.entityId).toBe(CAMERA_ID);

        rerender(tree("b"));
        expect(selection!.entityId).toBeNull();
    });

    it("throws when a hook is used outside a provider", () => {
        expect(() => renderHook(() => useSelection())).toThrow("inside <NgsiProvider>");
    });
});

describe("useCapabilities", () => {
    it("reports the adapters given to the nearest provider", () => {
        const limited = createMockNgsiAdapter(undefined, { capabilities: { subscriptions: false, temporal: false } });
        const { result } = renderHook(() => useCapabilities(), { wrapper: wrapper(limited) });

        expect(result.current).toEqual({
            subscriptions: false,
            notifications: true,
            temporal: false,
            live: true,
            savedQueries: true,
        });
    });
});
