import { useEffect } from "react";
import { EntityTable, useEntityTableContext, type EntityTableContextValue } from "@vela-tools/ui";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureEntities, fixtureTypes } from "../../src/testing/fixtures";
import { renderWithNgsi } from "../renderWithNgsi";
import { CA01, runtimeCommands, selection } from "../listRoots";
import { CommandsProbe, SelectionProbe } from "../ListRootProbes";
import { EntityTableRoot, type EntityTableRootProps } from "../../src/bound/EntityTableRoot";

afterEach(cleanup);

const contracts: Record<string, EntityTableContextValue> = {};

function Probe({ label, onValue }: { label: string; onValue?: (value: EntityTableContextValue) => void }) {
    const value = useEntityTableContext("Probe");
    useEffect(() => {
        contracts[label] = value;
        onValue?.(value);
    }, [label, value, onValue]);
    return null;
}

function Table({ label = "table", ...props }: Partial<EntityTableRootProps> & { label?: string }) {
    return (
        <EntityTableRoot {...props}>
            <Probe label={label} />
            {props.children}
        </EntityTableRoot>
    );
}

const contract = (label = "table") => contracts[label];
const ids = (label = "table") => contract(label).entities.map((e) => e.id);
const cameraIds = fixtureEntities.filter((e) => e.type === "Camera").map((e) => e.id);

describe("EntityTableRoot", () => {
    it("lists the active query and follows it", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <Table />
            </>,
        );
        await waitFor(() => expect(ids()).toHaveLength(fixtureEntities.length));
        act(() => void runtimeCommands().setQuery({ types: [fixtureTypes.Camera] }));
        await waitFor(() => expect(ids()).toEqual(cameraIds));
    });

    it("pinned types ignore a shared type change but keep the active query otherwise", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <Table types={[fixtureTypes.Camera]} />
            </>,
        );
        await waitFor(() => expect(ids()).toEqual(cameraIds));
        act(() => void runtimeCommands().selectTypes([fixtureTypes.OSMPlace]));
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(ids()).toEqual(cameraIds);
    });

    it("an explicit query replaces the active query", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <Table query={{ types: [fixtureTypes.OSMPlace] }} />
            </>,
        );
        await waitFor(() => expect(ids()).toEqual(["urn:ngsi-ld:OSMPlace:example-pier"]));
        act(() => void runtimeCommands().setQuery({ types: [fixtureTypes.Camera] }));
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(ids()).toEqual(["urn:ngsi-ld:OSMPlace:example-pier"]);
    });

    it("shared selection goes through the provider", async () => {
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Table label="a" />
                <Table label="b" />
            </>,
        );
        await waitFor(() => expect(ids("a").length).toBeGreaterThan(0));
        act(() => contract("a").select(CA01));
        expect(selection().entityId).toBe(CA01);
        expect(contract("b").selectedId).toBe(CA01);
    });

    it("local selection stays in the Root", async () => {
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Table label="local" selection="local" />
                <Table label="shared" />
            </>,
        );
        await waitFor(() => expect(ids("local").length).toBeGreaterThan(0));
        act(() => contract("local").select(CA01));
        expect(contract("local").selectedId).toBe(CA01);
        expect(contract("shared").selectedId).toBeNull();
        expect(selection().entityId).toBeNull();
    });

    it("controlled selection only calls onSelect", async () => {
        const onSelect = vi.fn();
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Table selectedId={null} onSelect={onSelect} />
            </>,
        );
        await waitFor(() => expect(ids().length).toBeGreaterThan(0));
        act(() => contract().select(CA01));
        expect(onSelect).toHaveBeenCalledWith(CA01);
        expect(contract().selectedId).toBeNull();
        expect(selection().entityId).toBeNull();
    });

    it("keeps columns and filters in the Root, driven by the toolbar parts", async () => {
        renderWithNgsi(
            <Table defaultColumns={["id"]}>
                <EntityTable.Toolbar />
            </Table>,
        );
        expect(contract().columns).toEqual(["id"]);
        expect(contract().defaultColumns).toEqual(["id"]);

        fireEvent.click(screen.getByRole("button", { name: "Filters" }));
        expect(contract().showFilters).toBe(true);

        act(() => contract().setColumns?.(["id", "status"]));
        expect(contract().columns).toEqual(["id", "status"]);
    });

    it("passes typeColors through, or generates them per listed type", async () => {
        const { unmount } = renderWithNgsi(<Table typeColors={{ Camera: "#ff0000" }} />);
        await waitFor(() => expect(ids().length).toBeGreaterThan(0));
        expect(contract().typeColors).toEqual({ Camera: "#ff0000" });
        unmount();

        renderWithNgsi(<Table autoGenerateTypeColors />);
        await waitFor(() =>
            expect(Object.keys(contract().typeColors ?? {}).sort()).toEqual(
                [...new Set(fixtureEntities.map((e) => e.type))].sort(),
            ),
        );
    });

    it("shows a failed request", async () => {
        renderWithNgsi(
            <Table>
                <EntityTable.Error />
            </Table>,
            { failOn: ["entities.queryEntities"] },
        );
        expect((await screen.findByRole("alert")).textContent).toMatch(/entities\.queryEntities: failed/);
    });

    it("keeps the contract value stable while nothing changes", async () => {
        const onValue = vi.fn();
        const ui = (
            <EntityTableRoot>
                <Probe label="stable" onValue={onValue} />
            </EntityTableRoot>
        );
        const { rerender } = renderWithNgsi(ui);
        await waitFor(() => expect(contract("stable").entities.length).toBeGreaterThan(0));
        const calls = onValue.mock.calls.length;
        rerender(
            <EntityTableRoot>
                <Probe label="stable" onValue={onValue} />
            </EntityTableRoot>,
        );
        expect(onValue).toHaveBeenCalledTimes(calls);
    });
});
