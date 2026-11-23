import { ItemPicker } from "@vela-tools/ui";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureTypes } from "../../src/testing/fixtures";
import { renderWithNgsi } from "../renderWithNgsi";
import { AttributeListRoot } from "../../src/bound/AttributeListRoot";
import { EntityListRoot } from "../../src/bound/EntityListRoot";
import { CA01, picker, pressed, selection } from "../listRoots";
import { Picker, SelectionProbe } from "../ListRootProbes";
import { TypeListRoot } from "../../src/bound/TypeListRoot";

afterEach(cleanup);

describe("TypeListRoot", () => {
    it("lists the broker types", async () => {
        renderWithNgsi(<Picker label="types">{(parts) => <TypeListRoot>{parts}</TypeListRoot>}</Picker>);
        expect(await picker("types").findByRole("button", { name: "Camera" })).toBeTruthy();
        expect(picker("types").getByRole("button", { name: "OSMPlace" })).toBeTruthy();
    });

    it("shows a failed request", async () => {
        renderWithNgsi(<Picker label="types">{(parts) => <TypeListRoot>{parts}</TypeListRoot>}</Picker>, {
            failOn: ["entities.listTypes"],
        });
        expect(await screen.findByRole("alert")).toBeTruthy();
    });

    it("reports the type ref with the id when controlled", async () => {
        const onSelect = vi.fn();
        renderWithNgsi(
            <Picker label="types">
                {(parts) => (
                    <TypeListRoot selectedId={null} onSelect={onSelect}>
                        {parts}
                    </TypeListRoot>
                )}
            </Picker>,
        );
        fireEvent.click(await picker("types").findByRole("button", { name: "Camera" }));
        expect(onSelect).toHaveBeenCalledWith(
            `${fixtureTypes.Camera.contextUri}Camera`,
            expect.objectContaining({ type: "Camera", contextUri: fixtureTypes.Camera.contextUri }),
        );
    });
});

describe("EntityListRoot", () => {
    it("shows the empty text when the query matches nothing", async () => {
        renderWithNgsi(
            <Picker label="entities">
                {(parts) => (
                    <EntityListRoot types={[{ type: "Nothing" }]} emptyText="No cameras here">
                        {parts}
                    </EntityListRoot>
                )}
            </Picker>,
        );
        expect(await screen.findByText("No cameras here")).toBeTruthy();
    });

    it("shows a failed request", async () => {
        renderWithNgsi(<Picker label="entities">{(parts) => <EntityListRoot>{parts}</EntityListRoot>}</Picker>, {
            failOn: ["entities.queryEntities"],
        });
        expect(await screen.findByRole("alert")).toBeTruthy();
    });
});

describe("AttributeListRoot", () => {
    it("shows nothing without an entity", () => {
        renderWithNgsi(<Picker label="attributes">{(parts) => <AttributeListRoot>{parts}</AttributeListRoot>}</Picker>);
        expect(picker("attributes").queryByRole("button")).toBeNull();
        expect(picker("attributes").queryByText(/./)).toBeNull();
    });

    it("reports an entity the broker does not have", async () => {
        renderWithNgsi(
            <Picker label="attributes">
                {(parts) => <AttributeListRoot entityId="urn:ngsi-ld:Camera:nope">{parts}</AttributeListRoot>}
            </Picker>,
        );
        expect(await screen.findByText("Entity not found")).toBeTruthy();
    });

    it("use selects the attribute and calls onUse with the entity", async () => {
        const onUse = vi.fn();
        renderWithNgsi(
            <>
                <SelectionProbe />
                <section aria-label="attributes">
                    <AttributeListRoot entityId={CA01} selection="shared" onUse={onUse}>
                        <ItemPicker.List />
                    </AttributeListRoot>
                </section>
            </>,
        );
        await picker("attributes").findByRole("button", { name: "status" });
        const useButtons = picker("attributes").getAllByRole("button", { name: "Use" });
        const names = picker("attributes")
            .getAllByRole("button", { pressed: false })
            .map((b) => b.textContent);
        fireEvent.click(useButtons[names.indexOf("status")]);
        expect(onUse).toHaveBeenCalledWith("status", expect.objectContaining({ id: CA01 }));
        expect(selection()).toMatchObject({ entityId: CA01, attribute: "status" });
        expect(pressed("attributes", "status")).toBe(true);
    });
});
