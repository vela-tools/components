import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fakeItemPickerContext, type Fruit } from "../../../itemPickerContext";
import { renderPart } from "../../../renderPart";
import { ItemPickerProvider } from "../../../../src/primitives/ItemPicker/ItemPickerProvider";
import { Empty } from "../../../../src/primitives/ItemPicker/parts/Empty";
import { Error } from "../../../../src/primitives/ItemPicker/parts/Error";
import { Filter } from "../../../../src/primitives/ItemPicker/parts/Filter";
import { Header } from "../../../../src/primitives/ItemPicker/parts/Header";
import { Item } from "../../../../src/primitives/ItemPicker/parts/Item";
import { List } from "../../../../src/primitives/ItemPicker/parts/List";
import { UseButton } from "../../../../src/primitives/ItemPicker/parts/UseButton";

const itemButton = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
const typeFilter = (text: string) =>
    fireEvent.change(screen.getByRole("textbox", { name: "Search..." }), { target: { value: text } });

describe("ItemPicker.List and Item", () => {
    it("renders an item per entry and marks the selected one", () => {
        renderPart(<List />, ItemPickerProvider, fakeItemPickerContext({ selectedId: "b", use: undefined }));
        expect(itemButton("Apple").getAttribute("aria-pressed")).toBe("false");
        expect(itemButton("Banana").getAttribute("aria-pressed")).toBe("true");
    });

    it("calls select with the item id on click", () => {
        const context = fakeItemPickerContext({ use: undefined });
        renderPart(<List />, ItemPickerProvider, context);
        fireEvent.click(itemButton("Cherry"));
        expect(context.select).toHaveBeenCalledWith("c");
    });

    it("renders custom item content", () => {
        renderPart(
            <List>{(item) => <Item>{(item as Fruit).name.toUpperCase()}</Item>}</List>,
            ItemPickerProvider,
            fakeItemPickerContext({ use: undefined }),
        );
        expect(itemButton("APPLE")).toBeTruthy();
    });

    it("marks the list stale", () => {
        const { container } = renderPart(<List />, ItemPickerProvider, fakeItemPickerContext({ stale: true }));
        expect(container.querySelector("[data-stale]")).not.toBeNull();
    });
});

describe("ItemPicker.Filter", () => {
    it("narrows the list by name, ignoring case", () => {
        renderPart(
            <>
                <Filter />
                <List />
            </>,
            ItemPickerProvider,
            fakeItemPickerContext({ use: undefined }),
        );
        typeFilter("AN");
        expect(screen.queryByText("Apple")).toBeNull();
        expect(screen.getByText("Banana")).toBeTruthy();
    });

    it("drives Empty when nothing matches", () => {
        renderPart(
            <>
                <Filter />
                <Empty />
                <List />
            </>,
            ItemPickerProvider,
            fakeItemPickerContext(),
        );
        expect(screen.queryByText("No fruit")).toBeNull();
        typeFilter("kiwi");
        expect(screen.getByText("No fruit")).toBeTruthy();
    });
});

describe("ItemPicker.UseButton", () => {
    it("calls use with the item id", () => {
        const context = fakeItemPickerContext();
        renderPart(<List />, ItemPickerProvider, context);
        fireEvent.click(screen.getAllByRole("button", { name: "Use" })[1]);
        expect(context.use).toHaveBeenCalledWith("b");
        expect(context.select).not.toHaveBeenCalled();
    });

    it("renders nothing without use", () => {
        renderPart(<List />, ItemPickerProvider, fakeItemPickerContext({ use: undefined }));
        expect(screen.queryByRole("button", { name: "Use" })).toBeNull();
    });

    it("throws a clear error outside the list", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() =>
            render(
                <ItemPickerProvider value={fakeItemPickerContext()}>
                    <UseButton />
                </ItemPickerProvider>,
            ),
        ).toThrow("<ItemPicker.UseButton> must be used inside ItemPicker.List.");
        spy.mockRestore();
    });
});

describe("ItemPicker.Empty", () => {
    it("shows the empty text only without items", () => {
        const { unmount } = renderPart(<Empty />, ItemPickerProvider, fakeItemPickerContext());
        expect(screen.queryByText("No fruit")).toBeNull();
        unmount();
        renderPart(<Empty />, ItemPickerProvider, fakeItemPickerContext({ items: [] }));
        expect(screen.getByText("No fruit")).toBeTruthy();
    });

    it("stays hidden while loading or without empty text", () => {
        const { unmount } = renderPart(
            <Empty />,
            ItemPickerProvider,
            fakeItemPickerContext({ items: [], loading: true }),
        );
        expect(screen.queryByText("No fruit")).toBeNull();
        unmount();
        const { container } = renderPart(
            <Empty />,
            ItemPickerProvider,
            fakeItemPickerContext({ items: [], emptyText: undefined }),
        );
        expect(container.querySelector("p")).toBeNull();
    });
});

describe("ItemPicker.Header and Error", () => {
    it("Header shows the title", () => {
        renderPart(<Header title="Fruit" />, ItemPickerProvider, fakeItemPickerContext());
        expect(screen.getByText("Fruit")).toBeTruthy();
    });

    it("Error shows only when there is one", () => {
        const { unmount } = renderPart(<Error />, ItemPickerProvider, fakeItemPickerContext());
        expect(screen.queryByRole("alert")).toBeNull();
        unmount();
        renderPart(<Error />, ItemPickerProvider, fakeItemPickerContext({ error: "Broker down" }));
        expect(screen.getByRole("alert").textContent).toBe("Broker down");
    });

    it("parts throw outside a Root", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Header title="Fruit" />)).toThrow(
            "<ItemPicker.Header> must be used inside a ItemPicker Root.",
        );
        spy.mockRestore();
    });
});
