import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NgsiAdapters } from "../../src/adapters";
import { useEntities } from "../../src/hooks/useEntities";
import { useNgsiCommands } from "../../src/hooks/useNgsi";
import { NgsiProvider } from "../../src/runtime/NgsiProvider";
import { createMockNgsiAdapter, type MockAdapterOptions } from "../../src/testing/createMockNgsiAdapter";
import { fixtureTypes } from "../../src/testing/fixtures";
import type { EntityQuery } from "../../src/types";
import { QueryBuilder, type QueryBuilderProps } from "../../src/composites/QueryBuilder";

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
    if (!("fonts" in document)) {
        Object.defineProperty(document, "fonts", {
            value: { addEventListener: () => {}, removeEventListener: () => {}, ready: Promise.resolve() },
        });
    }
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

function EntityIds() {
    const { data } = useEntities();
    return (
        <ul aria-label="entities">
            {data?.entities.map((e) => (
                <li key={e.id}>{e.id}</li>
            ))}
        </ul>
    );
}

function MapStub() {
    const commands = useNgsiCommands();
    return (
        <button
            type="button"
            onClick={() => commands.setGeoFilter({ label: "Pier", lat: 52.1, lon: 4.27, radiusKm: 1 })}
        >
            Map click
        </button>
    );
}

function renderBuilder(options: MockAdapterOptions = {}, props: Partial<QueryBuilderProps> = {}) {
    adapters = createMockNgsiAdapter(undefined, options);
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <MantineProvider env="test">
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={{ id: "test", name: "Test" }} adapters={adapters}>
                    {children}
                    <EntityIds />
                    <MapStub />
                </NgsiProvider>
            </QueryClientProvider>
        </MantineProvider>
    );
    return render(<QueryBuilder {...props} />, { wrapper: Wrapper });
}

const listed = () =>
    within(screen.getByRole("list", { name: "entities" }))
        .queryAllByRole("listitem")
        .map((li) => li.textContent);

const typeRow = (name: string) => screen.findByRole("button", { name: new RegExp(`^${name}\\b`) });
const run = () => fireEvent.click(screen.getByRole("button", { name: "Run" }));

const switchToText = (text: string) => {
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Query text" }), { target: { value: text } });
};

describe("QueryBuilder", () => {
    it("runs the picked type, and the entity list under the same provider follows", async () => {
        const onQueryRun = vi.fn();
        renderBuilder({}, { onQueryRun });
        await waitFor(() => expect(listed().length).toBeGreaterThan(2));

        fireEvent.click(await typeRow("Camera"));
        run();

        await waitFor(() => expect(listed()).toEqual(["urn:ngsi-ld:Camera:camera-1", "urn:ngsi-ld:Camera:camera-2"]));
        expect(onQueryRun).toHaveBeenCalledWith({ types: [fixtureTypes.Camera] });
    });

    it("runs a condition typed in text mode", async () => {
        renderBuilder();
        fireEvent.click(await typeRow("Camera"));

        switchToText(`type=${fixtureTypes.Camera.contextUri}Camera&q=status=="faulty"`);
        run();

        await waitFor(() => expect(listed()).toEqual(["urn:ngsi-ld:Camera:camera-2"]));
    });

    it("shows an invalid text query inline and leaves the list as it was", async () => {
        renderBuilder();
        await waitFor(() => expect(listed().length).toBeGreaterThan(2));
        const before = listed();
        const queryEntities = vi.spyOn(adapters.entities, "queryEntities");

        switchToText("type=Camera&attrs=name");
        run();

        expect((await screen.findByRole("alert")).textContent).toBe("Not supported in the query: attrs");
        expect(listed()).toEqual(before);
        expect(queryEntities).not.toHaveBeenCalled();
    });

    it("refetches when the same query is run twice", async () => {
        renderBuilder();
        fireEvent.click(await typeRow("Camera"));
        run();
        await waitFor(() => expect(listed()).toHaveLength(2));
        const queryEntities = vi.spyOn(adapters.entities, "queryEntities");

        run();

        await waitFor(() => expect(queryEntities).toHaveBeenCalledTimes(1));
        expect(queryEntities.mock.calls[0][0]).toEqual({ types: [fixtureTypes.Camera] });
    });

    it("takes over a geo filter set from outside", async () => {
        renderBuilder();
        expect(await screen.findByText("No region set")).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Map click" }));

        expect(await screen.findByText("Pier · 1 km")).toBeTruthy();
    });

    it("has no saved-queries panel or Save button without a SavedQueryStore", async () => {
        renderBuilder({ capabilities: { savedQueries: false } });
        await typeRow("Camera");

        expect(screen.queryByText("Saved queries")).toBeNull();
        expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    it("loads a saved query into the builder", async () => {
        renderBuilder();

        fireEvent.click(await screen.findByRole("button", { name: /^Busy crowd sensors near the centre/ }));

        expect(
            await screen.findByText(
                `type=${fixtureTypes.CrowdFlowObserved.contextUri}CrowdFlowObserved&q=occupancy>0.5&geometry=Point&coordinates=[-25.6993,52.0705]&georel=near;maxDistance==2000`,
            ),
        ).toBeTruthy();
        expect(screen.getByText("Centre · 2 km")).toBeTruthy();
    });

    it("runs a saved query from its row", async () => {
        const onQueryRun = vi.fn<(query: EntityQuery) => void>();
        renderBuilder({}, { onQueryRun });

        fireEvent.click(await screen.findByRole("button", { name: "Run Busy crowd sensors near the centre" }));

        await waitFor(() => expect(onQueryRun).toHaveBeenCalledTimes(1));
        expect(onQueryRun.mock.calls[0][0]).toMatchObject({ q: "occupancy>0.5" });
    });

    it("saves the draft under a name, then deletes it", async () => {
        renderBuilder();
        fireEvent.click(await typeRow("Camera"));

        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        fireEvent.change(await screen.findByRole("textbox", { name: "Query name" }), { target: { value: "Cameras" } });
        fireEvent.click(screen.getByRole("button", { name: "Save Query" }));

        const row = await screen.findByRole("button", { name: /^Cameras/ });
        expect(row.getAttribute("aria-current")).toBe("true");

        fireEvent.click(screen.getByRole("button", { name: "Delete Cameras" }));
        await waitFor(() => expect(screen.queryByRole("button", { name: /^Cameras/ })).toBeNull());
    });

    it("shows a failing save and keeps the saved list", async () => {
        renderBuilder({ failOn: ["savedQueries.save"] });
        fireEvent.click(await typeRow("Camera"));
        await screen.findByRole("button", { name: /^Busy crowd sensors near the centre/ });

        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        fireEvent.change(await screen.findByRole("textbox", { name: "Query name" }), { target: { value: "Cameras" } });
        fireEvent.click(screen.getByRole("button", { name: "Save Query" }));

        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(screen.queryByRole("button", { name: /^Cameras/ })).toBeNull();
        expect(screen.getByRole("button", { name: /^Busy crowd sensors near the centre/ })).toBeTruthy();
    });
});
