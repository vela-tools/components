import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { CA01, runtimeCommands } from "../listRoots";
import { CommandsProbe } from "../ListRootProbes";
import { EntityBrowser } from "../../src/composites/EntityBrowser";

afterEach(cleanup);

const badgeText = () => document.querySelector(".mantine-Badge-root")?.textContent;

describe("EntityBrowser", () => {
    it("shows the toolbar, the tabs and no selection at first", () => {
        renderWithNgsi(<EntityBrowser />);
        expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Columns" })).toBeTruthy();
        expect(screen.getByRole("tab", { name: "Properties" })).toBeTruthy();
        expect(screen.getByRole("tab", { name: "Raw JSON-LD" })).toBeTruthy();
        expect(badgeText()).toBe("No entity selected");
    });

    it("shows the selected entity in the header and as JSON-LD", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <EntityBrowser />
            </>,
        );
        act(() => void runtimeCommands().selectEntity(CA01));
        await waitFor(() => expect(badgeText()).toBe(`Camera - ${CA01}`));

        fireEvent.click(screen.getByRole("tab", { name: "Raw JSON-LD" }));
        expect(await screen.findByText(`"${CA01}"`)).toBeTruthy();
    });

    it("lists the column choices of the loaded entities", async () => {
        renderWithNgsi(<EntityBrowser defaultColumns={["id"]} />);
        fireEvent.click(screen.getByRole("button", { name: "Columns" }));
        await waitFor(() => {
            const values = screen
                .getAllByRole("checkbox", { hidden: true })
                .map((box) => (box as HTMLInputElement).value);
            expect(values).toContain("status");
        });
        const id = screen
            .getAllByRole("checkbox", { hidden: true })
            .find((box) => (box as HTMLInputElement).value === "id");
        expect((id as HTMLInputElement).checked).toBe(true);
    });

    it("shows a failed entity query", async () => {
        renderWithNgsi(<EntityBrowser />, { failOn: ["entities.queryEntities"] });
        expect((await screen.findByRole("alert")).textContent).toMatch(/entities\.queryEntities: failed/);
    });

    it("shows the chosen columns as grid headers, with header filters on toggle", async () => {
        const { container } = renderWithNgsi(<EntityBrowser defaultColumns={["id", "type", "status"]} />);
        const headers = () =>
            Array.from(
                container.querySelector(".tabulator")?.querySelectorAll(".tabulator-col[tabulator-field]") ?? [],
            ).map((col) => col.getAttribute("tabulator-field"));
        await waitFor(() => expect(headers()).toEqual(["id", "type", "status"]));
        expect(container.querySelector(".tabulator")?.querySelector(".tabulator-header-filter input")).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Filters" }));
        await waitFor(() =>
            expect(
                container.querySelector(".tabulator")?.querySelectorAll(".tabulator-header-filter input"),
            ).toHaveLength(3),
        );
    });
});
