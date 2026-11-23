import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { newQueryCondition } from "../../../../src/primitives/QueryBuilder/queryBuilder.utils";
import { fakeQueryBuilderContext, fakeSavedQueries, queryDraft } from "../../../queryBuilderContext";
import { renderPart } from "../../../renderPart";
import { QueryBuilderProvider } from "../../../../src/primitives/QueryBuilder/QueryBuilder.context";
import { Actions } from "../../../../src/primitives/QueryBuilder/parts/Actions";
import { Conditions } from "../../../../src/primitives/QueryBuilder/parts/Conditions";
import { EntityTypes } from "../../../../src/primitives/QueryBuilder/parts/EntityTypes";
import { Error } from "../../../../src/primitives/QueryBuilder/parts/Error";
import { GeoRegion } from "../../../../src/primitives/QueryBuilder/parts/GeoRegion";
import { Preview } from "../../../../src/primitives/QueryBuilder/parts/Preview";
import { SavedQueries } from "../../../../src/primitives/QueryBuilder/parts/SavedQueries";

const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
const typeRow = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}\\b`) });

describe("QueryBuilder.EntityTypes", () => {
    it("toggles a type into the draft", () => {
        const context = fakeQueryBuilderContext();
        renderPart(<EntityTypes />, QueryBuilderProvider, context);
        expect(typeRow("Camera").getAttribute("aria-pressed")).toBe("true");
        fireEvent.click(typeRow("Sensor"));
        expect(context.setDraft).toHaveBeenCalledWith({ ...context.draft, typeKeys: ["Camera", "Sensor"] });
    });

    it("selects all types", () => {
        const context = fakeQueryBuilderContext();
        renderPart(<EntityTypes />, QueryBuilderProvider, context);
        fireEvent.click(button("Select all types"));
        expect(context.setDraft).toHaveBeenCalledWith({ ...context.draft, typeKeys: ["Camera", "Sensor"] });
    });

    it("narrows the list by search", () => {
        renderPart(<EntityTypes />, QueryBuilderProvider, fakeQueryBuilderContext());
        fireEvent.change(screen.getByRole("textbox", { name: "Search types" }), { target: { value: "sen" } });
        expect(screen.queryByRole("button", { name: /^Camera/ })).toBeNull();
        expect(typeRow("Sensor")).toBeTruthy();
    });
});

describe("QueryBuilder.Conditions", () => {
    it("adds a condition", () => {
        const context = fakeQueryBuilderContext();
        renderPart(<Conditions />, QueryBuilderProvider, context);
        fireEvent.click(button("Add Condition"));
        const next = vi.mocked(context.setDraft).mock.calls[0][0];
        expect(next.conditions).toHaveLength(2);
        expect(next.conditions[0]).toBe(context.draft.conditions[0]);
    });

    it("removes a condition but never the last one", () => {
        const [first, second] = [
            newQueryCondition({ property: "status" }),
            newQueryCondition({ property: "temperature" }),
        ];
        const context = fakeQueryBuilderContext({ draft: queryDraft({ conditions: [first, second] }) });
        renderPart(<Conditions />, QueryBuilderProvider, context);
        fireEvent.click(screen.getAllByRole("button", { name: "Remove condition" })[0]);
        expect(context.setDraft).toHaveBeenCalledWith({ ...context.draft, conditions: [second] });
    });

    it("disables removing the only condition", () => {
        renderPart(<Conditions />, QueryBuilderProvider, fakeQueryBuilderContext());
        expect(button("Remove condition").disabled).toBe(true);
    });

    it("switches to text mode seeded from the preview", () => {
        const context = fakeQueryBuilderContext();
        renderPart(<Conditions />, QueryBuilderProvider, context);
        fireEvent.click(button("Text"));
        expect(context.setDraft).toHaveBeenCalledWith({ ...context.draft, mode: "text", text: context.preview });
    });

    it("edits the text query in text mode", () => {
        const context = fakeQueryBuilderContext({ draft: queryDraft({ mode: "text", text: "type=Camera" }) });
        renderPart(<Conditions />, QueryBuilderProvider, context);
        fireEvent.change(screen.getByRole("textbox", { name: "Query text" }), { target: { value: "type=Sensor" } });
        expect(context.setDraft).toHaveBeenCalledWith({ ...context.draft, text: "type=Sensor" });
    });

    it("resets on New query and renders its children", () => {
        const context = fakeQueryBuilderContext();
        renderPart(
            <Conditions>
                <Actions />
            </Conditions>,
            QueryBuilderProvider,
            context,
        );
        fireEvent.click(button("New query"));
        expect(context.reset).toHaveBeenCalledTimes(1);
        expect(button("Run")).toBeTruthy();
    });
});

describe("QueryBuilder.Preview and Error", () => {
    it("Preview shows the query only in builder mode", () => {
        const { unmount } = renderPart(<Preview />, QueryBuilderProvider, fakeQueryBuilderContext());
        expect(screen.getByText("type=Camera&q=temperature>25")).toBeTruthy();
        unmount();
        renderPart(<Preview />, QueryBuilderProvider, fakeQueryBuilderContext({ draft: queryDraft({ mode: "text" }) }));
        expect(screen.queryByText("type=Camera&q=temperature>25")).toBeNull();
    });

    it("Error shows only when there is one", () => {
        const { unmount } = renderPart(<Error />, QueryBuilderProvider, fakeQueryBuilderContext());
        expect(screen.queryByRole("alert")).toBeNull();
        unmount();
        renderPart(<Error />, QueryBuilderProvider, fakeQueryBuilderContext({ error: "Broker down" }));
        expect(screen.getByRole("alert").textContent).toBe("Broker down");
    });
});

describe("QueryBuilder.Actions", () => {
    it("runs, and disables while busy", () => {
        const context = fakeQueryBuilderContext();
        const { unmount } = renderPart(<Actions />, QueryBuilderProvider, context);
        fireEvent.click(button("Run"));
        expect(context.run).toHaveBeenCalledTimes(1);
        unmount();
        renderPart(<Actions />, QueryBuilderProvider, fakeQueryBuilderContext({ busy: true }));
        expect(button("Run").disabled).toBe(true);
    });

    it("shows Save only with saved queries", () => {
        renderPart(<Actions />, QueryBuilderProvider, fakeQueryBuilderContext());
        expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    it("saves under a new name", async () => {
        const saved = fakeSavedQueries();
        renderPart(<Actions />, QueryBuilderProvider, fakeQueryBuilderContext({ saved }));
        fireEvent.click(button("Save"));
        const name = await screen.findByRole("textbox", { name: "Query name" });
        fireEvent.change(name, { target: { value: " Warm " } });
        fireEvent.keyDown(name, { key: "Enter" });
        expect(saved.save).toHaveBeenCalledWith("Warm");
    });

    it("updates the loaded saved query", () => {
        const saved = fakeSavedQueries({ loadedId: "q1" });
        renderPart(<Actions />, QueryBuilderProvider, fakeQueryBuilderContext({ saved }));
        fireEvent.click(button("Save"));
        expect(saved.update).toHaveBeenCalledTimes(1);
        expect(saved.save).not.toHaveBeenCalled();
    });

    it("hides Run without run, and renders nothing without run or saved queries", () => {
        const { container, unmount } = renderPart(
            <Actions />,
            QueryBuilderProvider,
            fakeQueryBuilderContext({ run: undefined }),
        );
        expect(screen.queryByRole("button", { name: "Run" })).toBeNull();
        expect(container.querySelector(".mantine-Group-root")).toBeNull();
        unmount();
        renderPart(
            <Actions />,
            QueryBuilderProvider,
            fakeQueryBuilderContext({ run: undefined, saved: fakeSavedQueries() }),
        );
        expect(screen.queryByRole("button", { name: "Run" })).toBeNull();
        expect(button("Save")).toBeTruthy();
    });
});

describe("QueryBuilder.GeoRegion", () => {
    it("picks a preset", async () => {
        const context = fakeQueryBuilderContext();
        renderPart(<GeoRegion />, QueryBuilderProvider, context);
        expect(screen.getByText("No region set")).toBeTruthy();
        fireEvent.click(button("Edit"));
        fireEvent.click(await screen.findByRole("button", { name: /^Delft/ }));
        expect(context.setDraft).toHaveBeenCalledWith({ ...context.draft, geo: context.presets[0] });
    });

    it("shows the region and clears it when disabled", () => {
        const context = fakeQueryBuilderContext({
            draft: queryDraft({ geo: { label: "Delft", lat: 52.01, lon: 4.36, radiusKm: 2 } }),
        });
        renderPart(<GeoRegion />, QueryBuilderProvider, context);
        expect(screen.getByText("Delft · 2 km")).toBeTruthy();
        fireEvent.click(screen.getByRole("checkbox", { name: "Enabled" }));
        expect(context.setDraft).toHaveBeenCalledWith({ ...context.draft, geo: null });
    });
});

describe("QueryBuilder.SavedQueries", () => {
    it("renders nothing without saved queries", () => {
        renderPart(<SavedQueries />, QueryBuilderProvider, fakeQueryBuilderContext());
        expect(screen.queryByText("Saved queries")).toBeNull();
    });

    it("loads, runs and deletes a saved query", () => {
        const saved = fakeSavedQueries({ loadedId: "q2" });
        renderPart(<SavedQueries />, QueryBuilderProvider, fakeQueryBuilderContext({ saved }));
        expect(screen.getByText("Dry sensors").closest('[role="button"]')?.getAttribute("aria-current")).toBe("true");
        fireEvent.click(screen.getByText("Hot cameras"));
        expect(saved.load).toHaveBeenCalledWith("q1");
        fireEvent.click(button("Run Hot cameras"));
        expect(saved.runSaved).toHaveBeenCalledWith("q1");
        fireEvent.click(button("Delete Dry sensors"));
        expect(saved.remove).toHaveBeenCalledWith("q2");
        expect(saved.load).toHaveBeenCalledTimes(1);
    });

    it("hides row actions the Root does not support", () => {
        const saved = fakeSavedQueries({ runSaved: undefined, remove: undefined });
        renderPart(<SavedQueries />, QueryBuilderProvider, fakeQueryBuilderContext({ saved }));
        expect(screen.queryByRole("button", { name: "Run Hot cameras" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Delete Hot cameras" })).toBeNull();
    });

    it("shows the empty text", () => {
        renderPart(
            <SavedQueries />,
            QueryBuilderProvider,
            fakeQueryBuilderContext({ saved: fakeSavedQueries({ items: [] }) }),
        );
        expect(screen.getByText("No saved queries.")).toBeTruthy();
    });
});

describe("QueryBuilder parts outside a Root", () => {
    it("throw a clear error", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Conditions />)).toThrow(
            "<QueryBuilder.Conditions> must be used inside a QueryBuilder Root.",
        );
        spy.mockRestore();
    });
});
