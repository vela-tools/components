import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fakeBrokerConfigContext } from "../../../brokerConfigContext";
import { renderPart } from "../../../renderPart";
import { BrokerConfigProvider } from "../../../../src/primitives/BrokerConfig/BrokerConfigProvider";
import { Error } from "../../../../src/primitives/BrokerConfig/parts/Error";
import { Form } from "../../../../src/primitives/BrokerConfig/parts/Form";
import { List } from "../../../../src/primitives/BrokerConfig/parts/List";
import { NewButton } from "../../../../src/primitives/BrokerConfig/parts/NewButton";

const layout = (
    <>
        <List />
        <NewButton />
        <Form />
        <Error />
    </>
);

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe("BrokerConfig parts", () => {
    it("List shows every broker with the selected one checked", () => {
        renderPart(layout, BrokerConfigProvider, fakeBrokerConfigContext());
        expect((screen.getByLabelText("Den Haag") as HTMLInputElement).checked).toBe(true);
        expect((screen.getByLabelText("Rotterdam") as HTMLInputElement).checked).toBe(false);
        expect(screen.getByText("https://b.example/ngsi-ld/v1")).toBeTruthy();
    });

    it("List selects a broker", () => {
        const value = fakeBrokerConfigContext();
        renderPart(layout, BrokerConfigProvider, value);
        fireEvent.click(screen.getByLabelText("Rotterdam"));
        expect(value.select).toHaveBeenCalledWith("b");
    });

    it("List removes a broker and disables delete where canRemove says no", () => {
        const value = fakeBrokerConfigContext({ canRemove: (id) => id !== "a" });
        renderPart(layout, BrokerConfigProvider, value);
        expect((screen.getByLabelText("Delete Den Haag") as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByLabelText("Delete Rotterdam"));
        expect(value.remove).toHaveBeenCalledWith("b");
    });

    it("List has no delete buttons without remove", () => {
        renderPart(layout, BrokerConfigProvider, fakeBrokerConfigContext({ remove: undefined }));
        expect(screen.queryByLabelText("Delete Den Haag")).toBeNull();
    });

    it("NewButton opens an empty form with the default values and hides the list", () => {
        renderPart(layout, BrokerConfigProvider, fakeBrokerConfigContext());
        fireEvent.click(screen.getByRole("button", { name: "New broker" }));
        expect(screen.queryByLabelText("Den Haag")).toBeNull();
        expect(screen.queryByRole("button", { name: "New broker" })).toBeNull();
        expect(input("Broker name").value).toBe("");
        expect(input("Context URL").value).toBe("https://context.example");
    });

    it("Form saves trimmed values for a new broker and goes back to the list", () => {
        const value = fakeBrokerConfigContext();
        renderPart(layout, BrokerConfigProvider, value);
        fireEvent.click(screen.getByRole("button", { name: "New broker" }));
        const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
        expect(save.disabled).toBe(true);

        fireEvent.change(input("Broker name"), { target: { value: "  Utrecht " } });
        fireEvent.change(input("Broker URL"), { target: { value: "https://c.example " } });
        fireEvent.click(save);

        expect(value.save).toHaveBeenCalledWith(
            { name: "Utrecht", url: "https://c.example", contextUrl: "https://context.example" },
            null,
        );
        expect(screen.getByLabelText("Den Haag")).toBeTruthy();
    });

    it("Form edits an existing broker", () => {
        const value = fakeBrokerConfigContext();
        renderPart(layout, BrokerConfigProvider, value);
        fireEvent.click(screen.getByLabelText("Edit Den Haag"));
        expect(input("Broker name").value).toBe("Den Haag");
        fireEvent.change(input("Broker name"), { target: { value: "The Hague" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        expect(value.save).toHaveBeenCalledWith(
            { name: "The Hague", url: "https://a.example/ngsi-ld/v1", contextUrl: "" },
            "a",
        );
    });

    it("Form shows validation errors and blocks saving", () => {
        const validate = vi.fn((values: Record<string, string>) =>
            values.name === "Rotterdam" ? { name: "Name taken" } : {},
        );
        const value = fakeBrokerConfigContext({ validate });
        renderPart(layout, BrokerConfigProvider, value);
        fireEvent.click(screen.getByRole("button", { name: "New broker" }));
        fireEvent.change(input("Broker name"), { target: { value: "Rotterdam" } });
        fireEvent.change(input("Broker URL"), { target: { value: "https://c.example" } });

        expect(screen.getByText("Name taken")).toBeTruthy();
        expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
        expect(validate).toHaveBeenLastCalledWith(
            { name: "Rotterdam", url: "https://c.example", contextUrl: "https://context.example" },
            null,
        );
    });

    it("Form cancel goes back to the list without saving", () => {
        const value = fakeBrokerConfigContext();
        renderPart(layout, BrokerConfigProvider, value);
        fireEvent.click(screen.getByRole("button", { name: "New broker" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(value.save).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Den Haag")).toBeTruthy();
    });

    it("Error shows the contract error", () => {
        renderPart(<Error />, BrokerConfigProvider, fakeBrokerConfigContext({ error: "Storage full" }));
        expect(screen.getByRole("alert").textContent).toBe("Storage full");
    });
});
