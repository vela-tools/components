import { useEffect } from "react";
import { QueryBuilder, useQueryBuilderContext, type QueryBuilderContextValue } from "@vela-tools/ui";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureTypes } from "../../src/testing/fixtures";
import { renderWithNgsi } from "../renderWithNgsi";
import { CA01, CA02, picker } from "../listRoots";
import { Picker } from "../ListRootProbes";
import type { EntityQuery } from "../../src/types";
import { EntityListRoot } from "../../src/bound/EntityListRoot";
import { QueryBuilderRoot, type QueryBuilderRootProps } from "../../src/bound/QueryBuilderRoot";

afterEach(cleanup);

function Builder(props: Partial<QueryBuilderRootProps>) {
    return (
        <QueryBuilderRoot {...props}>
            <QueryBuilder.EntityTypes />
            <QueryBuilder.Conditions>
                <QueryBuilder.Preview />
                <QueryBuilder.Actions />
                <QueryBuilder.Error />
            </QueryBuilder.Conditions>
            <QueryBuilder.SavedQueries />
        </QueryBuilderRoot>
    );
}

const typeRow = (name: string) => screen.findByRole("button", { name: new RegExp(`^${name}\\b`) });
const run = () => fireEvent.click(screen.getByRole("button", { name: "Run" }));
const savedRow = () => screen.findByRole("button", { name: /^Busy crowd sensors near the centre/ });

describe("QueryBuilderRoot", () => {
    it("runs the draft as the active query, and an EntityList.Root follows", async () => {
        const onQueryRun = vi.fn();
        renderWithNgsi(
            <>
                <Builder onQueryRun={onQueryRun} />
                <Picker label="entities">{(parts) => <EntityListRoot>{parts}</EntityListRoot>}</Picker>
            </>,
        );
        fireEvent.click(await typeRow("Camera"));
        run();

        await waitFor(() => expect(onQueryRun).toHaveBeenCalledWith({ types: [fixtureTypes.Camera] }));
        await waitFor(() =>
            expect(
                picker("entities")
                    .getAllByRole("button")
                    .map((b) => b.textContent),
            ).toEqual([CA01, CA02]),
        );
    });

    it("starts from defaultQuery, so a layout without EntityTypes can run it", async () => {
        const onQueryRun = vi.fn<(query: EntityQuery) => void>();
        renderWithNgsi(
            <QueryBuilderRoot
                defaultQuery={{ types: [fixtureTypes.Camera], q: 'status=="faulty"' }}
                onQueryRun={onQueryRun}
            >
                <QueryBuilder.Actions />
            </QueryBuilderRoot>,
        );
        run();

        await waitFor(() => expect(onQueryRun).toHaveBeenCalledTimes(1));
        expect(onQueryRun.mock.calls[0][0]).toMatchObject({ types: [fixtureTypes.Camera], q: 'status=="faulty"' });
    });

    it("loads a saved query into the draft", async () => {
        renderWithNgsi(<Builder />);
        fireEvent.click(await savedRow());
        expect(await screen.findByText(/q=occupancy>0\.5/)).toBeTruthy();
        expect((await savedRow()).getAttribute("aria-current")).toBe("true");
    });

    it("has no saved-queries panel or Save button without the savedQueries capability", async () => {
        renderWithNgsi(<Builder />, { capabilities: { savedQueries: false } });
        await typeRow("Camera");
        expect(screen.queryByText("Saved queries")).toBeNull();
        expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    it("shows a failed type request", async () => {
        renderWithNgsi(<Builder />, { failOn: ["entities.listTypes"] });
        expect(await screen.findByRole("alert")).toBeTruthy();
    });

    it("shows a failing save and keeps the saved list", async () => {
        renderWithNgsi(<Builder />, { failOn: ["savedQueries.save"] });
        fireEvent.click(await typeRow("Camera"));
        await savedRow();

        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        const name = await screen.findByRole("textbox", { name: "Query name" });
        fireEvent.change(name, { target: { value: "Cameras" } });
        fireEvent.keyDown(name, { key: "Enter" });

        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(screen.queryByRole("button", { name: /^Cameras/ })).toBeNull();
    });

    it("keeps the contract value when its parent re-renders with the same props", async () => {
        const seen: QueryBuilderContextValue[] = [];
        function Probe() {
            const value = useQueryBuilderContext("Probe");
            useEffect(() => {
                seen.push(value);
            }, [value]);
            return null;
        }
        const { rerender } = renderWithNgsi(
            <QueryBuilderRoot>
                <Probe />
                <QueryBuilder.EntityTypes />
            </QueryBuilderRoot>,
        );
        await typeRow("Camera");
        await waitFor(() => expect(seen[seen.length - 1]?.saved?.items.length).toBeGreaterThan(0));
        const count = seen.length;
        rerender(
            <QueryBuilderRoot>
                <Probe />
                <QueryBuilder.EntityTypes />
            </QueryBuilderRoot>,
        );
        expect(seen.length).toBe(count);
    });
});
