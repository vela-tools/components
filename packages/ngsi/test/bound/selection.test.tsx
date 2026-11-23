import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureTypes } from "../../src/testing/fixtures";
import { renderWithNgsi } from "../renderWithNgsi";
import { AttributeListRoot } from "../../src/bound/AttributeListRoot";
import { EntityListRoot } from "../../src/bound/EntityListRoot";
import { CA01, CA02, item, picker, pressed, runtimeCommands, selection } from "../listRoots";
import { CommandsProbe, Picker, SelectionProbe } from "../ListRootProbes";
import { TypeListRoot } from "../../src/bound/TypeListRoot";

afterEach(cleanup);

describe("list Roots, shared selection", () => {
    it("type, entity and attribute lists follow each other through the provider", async () => {
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Picker label="types">{(parts) => <TypeListRoot>{parts}</TypeListRoot>}</Picker>
                <Picker label="entities">{(parts) => <EntityListRoot>{parts}</EntityListRoot>}</Picker>
                <Picker label="mirror">{(parts) => <EntityListRoot>{parts}</EntityListRoot>}</Picker>
                <Picker label="attributes">{(parts) => <AttributeListRoot>{parts}</AttributeListRoot>}</Picker>
            </>,
        );

        fireEvent.click(await picker("types").findByRole("button", { name: "Camera" }));
        await waitFor(() =>
            expect(picker("entities").queryByRole("button", { name: /VirtualCameraSensor/ })).toBeNull(),
        );
        expect(selection().types).toEqual([fixtureTypes.Camera]);
        expect(pressed("types", "Camera")).toBe(true);

        fireEvent.click(item("entities", CA01));
        expect(selection().entityId).toBe(CA01);
        expect(pressed("mirror", CA01)).toBe(true);

        fireEvent.click(await picker("attributes").findByRole("button", { name: "status" }));
        expect(selection().attribute).toBe("status");
        expect(pressed("attributes", "status")).toBe(true);
    });
});

describe("list Roots, local selection", () => {
    it("a local list is independent of the provider and of other lists", async () => {
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Picker label="shared">{(parts) => <EntityListRoot>{parts}</EntityListRoot>}</Picker>
                <Picker label="local">{(parts) => <EntityListRoot selection="local">{parts}</EntityListRoot>}</Picker>
            </>,
        );
        fireEvent.click(await picker("local").findByRole("button", { name: CA01 }));
        expect(pressed("local", CA01)).toBe(true);
        expect(pressed("shared", CA01)).toBe(false);
        expect(selection().entityId).toBeNull();

        fireEvent.click(item("shared", CA02));
        expect(selection().entityId).toBe(CA02);
        expect(pressed("local", CA01)).toBe(true);
        expect(pressed("local", CA02)).toBe(false);
    });
});

describe("list Roots, controlled selection", () => {
    it("only reports the selection and leaves the store alone", async () => {
        const onSelect = vi.fn();
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Picker label="entities">
                    {(parts) => (
                        <EntityListRoot selectedId={CA02} onSelect={onSelect}>
                            {parts}
                        </EntityListRoot>
                    )}
                </Picker>
            </>,
        );
        fireEvent.click(await picker("entities").findByRole("button", { name: CA01 }));
        expect(onSelect).toHaveBeenCalledWith(CA01);
        expect(pressed("entities", CA01)).toBe(false);
        expect(pressed("entities", CA02)).toBe(true);
        expect(selection().entityId).toBeNull();
    });
});

describe("AttributeListRoot pinned to an entity", () => {
    it("selects an attribute of an entity that is not the shared one (review finding 1)", async () => {
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Picker label="attributes">
                    {(parts) => (
                        <AttributeListRoot entityId={CA01} selection="shared">
                            {parts}
                        </AttributeListRoot>
                    )}
                </Picker>
            </>,
        );
        fireEvent.click(await picker("attributes").findByRole("button", { name: "status" }));
        expect(selection()).toMatchObject({ entityId: CA01, attribute: "status" });
        expect(pressed("attributes", "status")).toBe(true);
    });

    it("defaults to local selection", async () => {
        renderWithNgsi(
            <>
                <SelectionProbe />
                <Picker label="attributes">
                    {(parts) => <AttributeListRoot entityId={CA01}>{parts}</AttributeListRoot>}
                </Picker>
            </>,
        );
        fireEvent.click(await picker("attributes").findByRole("button", { name: "status" }));
        expect(pressed("attributes", "status")).toBe(true);
        expect(selection()).toMatchObject({ entityId: null, attribute: null });
    });

    it("does not show the shared attribute of another entity as selected", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <Picker label="shared">{(parts) => <AttributeListRoot>{parts}</AttributeListRoot>}</Picker>
                <Picker label="pinned">
                    {(parts) => (
                        <AttributeListRoot entityId={CA02} selection="shared">
                            {parts}
                        </AttributeListRoot>
                    )}
                </Picker>
            </>,
        );
        await picker("pinned").findByRole("button", { name: "status" });
        act(() => void runtimeCommands().selectEntity(CA01));
        fireEvent.click(await picker("shared").findByRole("button", { name: "status" }));
        expect(pressed("shared", "status")).toBe(true);
        expect(pressed("pinned", "status")).toBe(false);
    });
});

describe("EntityListRoot pinned to types", () => {
    it("ignores a shared type change", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <Picker label="cameras">
                    {(parts) => <EntityListRoot types={[fixtureTypes.Camera]}>{parts}</EntityListRoot>}
                </Picker>
                <Picker label="shared">{(parts) => <EntityListRoot>{parts}</EntityListRoot>}</Picker>
            </>,
        );
        await picker("cameras").findByRole("button", { name: CA01 });
        await screen.findAllByRole("button", { name: /CrowdFlowObserved/ });

        act(() => void runtimeCommands().selectTypes([fixtureTypes.CrowdFlowObserved]));

        await waitFor(() => expect(picker("shared").queryByRole("button", { name: CA01 })).toBeNull());
        expect(item("cameras", CA01)).toBeTruthy();
        expect(picker("cameras").queryByRole("button", { name: /CrowdFlowObserved/ })).toBeNull();
    });
});
