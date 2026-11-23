import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fakeEntityTableContext } from "../../../entityTableContext";
import { renderPart } from "../../../renderPart";
import { EntityTableProvider } from "../../../../src/primitives/EntityTable/EntityTable.context";
import { ColumnChooser } from "../../../../src/primitives/EntityTable/parts/ColumnChooser";
import { Error } from "../../../../src/primitives/EntityTable/parts/Error";
import { FiltersToggle } from "../../../../src/primitives/EntityTable/parts/FiltersToggle";
import { Toolbar } from "../../../../src/primitives/EntityTable/parts/Toolbar";

describe("EntityTable parts", () => {
    it("Toolbar shows the filters toggle and the column chooser by default", () => {
        renderPart(<Toolbar />, EntityTableProvider, fakeEntityTableContext());
        expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Columns" })).toBeTruthy();
    });

    it("Toolbar renders custom content", () => {
        renderPart(
            <Toolbar>
                <FiltersToggle label="Search" />
            </Toolbar>,
            EntityTableProvider,
            fakeEntityTableContext(),
        );
        expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Columns" })).toBeNull();
    });

    it("FiltersToggle flips showFilters", () => {
        const context = fakeEntityTableContext({ showFilters: true });
        renderPart(<FiltersToggle />, EntityTableProvider, context);
        const toggle = screen.getByRole("button", { name: "Filters" });
        expect(toggle.getAttribute("aria-pressed")).toBe("true");
        fireEvent.click(toggle);
        expect(context.setShowFilters).toHaveBeenCalledWith(false);
    });

    it("the toolbar parts render nothing without their setters", () => {
        renderPart(
            <Toolbar />,
            EntityTableProvider,
            fakeEntityTableContext({ setColumns: undefined, setShowFilters: undefined }),
        );
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("ColumnChooser lists the default columns and the attributes per type, and calls setColumns", async () => {
        const context = fakeEntityTableContext();
        renderPart(<ColumnChooser />, EntityTableProvider, context);
        fireEvent.click(screen.getByRole("button", { name: "Columns" }));
        const boxes = (await screen.findAllByRole("checkbox", { hidden: true })) as HTMLInputElement[];
        const checkbox = (value: string) => boxes.find((box) => box.value === value)!;
        expect(boxes.map((box) => box.value)).toEqual(["id", "type", "status", "humidity"]);
        expect(checkbox("id").checked).toBe(true);
        expect(checkbox("humidity").checked).toBe(false);
        expect(screen.getByText("Camera")).toBeTruthy();
        expect(screen.getByText("Sensor")).toBeTruthy();
        fireEvent.click(checkbox("humidity"));
        expect(context.setColumns).toHaveBeenCalledWith(["id", "type", "humidity"]);
    });

    it("Error shows the error", () => {
        renderPart(<Error />, EntityTableProvider, fakeEntityTableContext({ error: "Broker down" }));
        expect(screen.getByRole("alert").textContent).toBe("Broker down");
    });
});
