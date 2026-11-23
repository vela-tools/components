import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderPart } from "../../../renderPart";
import { fakeSubscriptionEditorContext } from "../../../subscriptionEditorContext";
import { emptyEditorValues } from "../../../../src/utils/subscriptions";
import {
    SubscriptionEditorProvider,
    type SubscriptionEditorField,
} from "../../../../src/primitives/SubscriptionEditor/SubscriptionEditor.context";
import { Advanced } from "../../../../src/primitives/SubscriptionEditor/parts/Advanced";
import { Description } from "../../../../src/primitives/SubscriptionEditor/parts/Description";
import { Endpoint } from "../../../../src/primitives/SubscriptionEditor/parts/Endpoint";
import { ExpiresAt } from "../../../../src/primitives/SubscriptionEditor/parts/ExpiresAt";
import { Format } from "../../../../src/primitives/SubscriptionEditor/parts/Format";
import { Lang } from "../../../../src/primitives/SubscriptionEditor/parts/Lang";
import { Name } from "../../../../src/primitives/SubscriptionEditor/parts/Name";
import { NotifyWhen } from "../../../../src/primitives/SubscriptionEditor/parts/NotifyWhen";
import { Payload } from "../../../../src/primitives/SubscriptionEditor/parts/Payload";
import { ScopeQuery } from "../../../../src/primitives/SubscriptionEditor/parts/ScopeQuery";
import { WatchedAttributes } from "../../../../src/primitives/SubscriptionEditor/parts/WatchedAttributes";

function Fields() {
    return (
        <>
            <Name />
            <Description />
            <Endpoint />
            <WatchedAttributes />
            <NotifyWhen />
            <ExpiresAt />
            <ScopeQuery />
            <Lang />
            <Advanced />
        </>
    );
}

const LABELS: Record<Exclude<SubscriptionEditorField, "payload">, string> = {
    name: "Name",
    description: "Description",
    watchedAttributes: "Watched attributes",
    notify: "Minimum seconds between notifications",
    expiresAt: "Expires",
    scopeQ: "Scope query",
    lang: "Language",
    jsonldContext: "@context for notifications",
    expandValues: "Expand values",
    jsonKeys: "JSON keys",
    endpoint: "Notification URI",
};

const input = (label: string) =>
    (screen.queryByRole("combobox", { name: label }) ?? screen.getByLabelText(label)) as HTMLInputElement;

describe("SubscriptionEditor field parts", () => {
    it.each(Object.keys(LABELS) as Exclude<SubscriptionEditorField, "payload">[])(
        "mark %s when it is invalid, and no other field",
        (field) => {
            renderPart(
                <Fields />,
                SubscriptionEditorProvider,
                fakeSubscriptionEditorContext({ invalid: new Set([field]) }),
            );
            for (const [other, label] of Object.entries(LABELS)) {
                expect(input(label).getAttribute("aria-invalid") === "true").toBe(other === field);
            }
        },
    );

    it("write the text fields through setField", () => {
        const context = fakeSubscriptionEditorContext();
        renderPart(<Fields />, SubscriptionEditorProvider, context);
        fireEvent.change(input("Name"), { target: { value: "Hot camera" } });
        fireEvent.change(input("Description"), { target: { value: "Above 30 degrees" } });
        fireEvent.change(input("Scope query"), { target: { value: "/Delft/#" } });
        fireEvent.change(input("Language"), { target: { value: "nl" } });
        fireEvent.change(input("Notification URI"), { target: { value: "https://hook.example/notify" } });
        expect(context.setField).toHaveBeenCalledWith("name", "Hot camera");
        expect(context.setField).toHaveBeenCalledWith("description", "Above 30 degrees");
        expect(context.setField).toHaveBeenCalledWith("scopeQ", "/Delft/#");
        expect(context.setField).toHaveBeenCalledWith("lang", "nl");
        expect(context.setField).toHaveBeenCalledWith("endpoint", "https://hook.example/notify");
    });

    it("offers the available attributes plus the ones already watched, and writes the selection through setField", async () => {
        const context = fakeSubscriptionEditorContext({
            values: { ...emptyEditorValues, watchedAttributes: ["legacy"] },
        });
        renderPart(<WatchedAttributes />, SubscriptionEditorProvider, context);
        fireEvent.click(input("Watched attributes"));
        const options = await screen.findAllByRole("option", { hidden: true });
        expect(options.map((o) => o.textContent)).toEqual(["status", "temperature", "legacy"]);
        fireEvent.click(options[0]);
        expect(context.setField).toHaveBeenCalledWith("watchedAttributes", ["legacy", "status"]);
    });

    it("disables watched attributes when notifying every N seconds", () => {
        const values = { ...emptyEditorValues, notify: { kind: "every" as const, triggers: [], seconds: 60 } };
        renderPart(<WatchedAttributes />, SubscriptionEditorProvider, fakeSubscriptionEditorContext({ values }));
        expect(input("Watched attributes").disabled).toBe(true);
    });

    it("writes the expiry as ISO, and empty when cleared", () => {
        const iso = new Date(2027, 0, 15, 9, 30).toISOString();
        const context = fakeSubscriptionEditorContext({ values: { ...emptyEditorValues, expiresAt: iso } });
        renderPart(<ExpiresAt />, SubscriptionEditorProvider, context);
        expect(input("Expires").value).toBe("2027-01-15T09:30");
        fireEvent.change(input("Expires"), { target: { value: "2027-02-01T08:00" } });
        expect(context.setField).toHaveBeenLastCalledWith("expiresAt", new Date(2027, 1, 1, 8, 0).toISOString());
        fireEvent.change(input("Expires"), { target: { value: "" } });
        expect(context.setField).toHaveBeenLastCalledWith("expiresAt", "");
    });

    it("throw a clear error outside a Root", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Name />)).toThrow(
            "<SubscriptionEditor.Name> must be used inside a SubscriptionEditor Root.",
        );
        spy.mockRestore();
    });
});

describe("SubscriptionEditor.NotifyWhen", () => {
    const notify = emptyEditorValues.notify;

    it("writes triggers in a fixed order and the throttling as a number", () => {
        const context = fakeSubscriptionEditorContext({
            values: { ...emptyEditorValues, notify: { ...notify, triggers: ["entityDeleted"] } },
        });
        renderPart(<NotifyWhen />, SubscriptionEditorProvider, context);
        fireEvent.click(screen.getByRole("checkbox", { name: "Entity created" }));
        expect(context.setField).toHaveBeenLastCalledWith("notify", {
            ...notify,
            triggers: ["entityCreated", "entityDeleted"],
        });
        fireEvent.change(input("Minimum seconds between notifications"), { target: { value: "30" } });
        expect(context.setField).toHaveBeenLastCalledWith("notify", {
            ...notify,
            triggers: ["entityDeleted"],
            throttling: 30,
        });
    });

    it("clears the throttling when the input is emptied", () => {
        const context = fakeSubscriptionEditorContext({
            values: { ...emptyEditorValues, notify: { ...notify, throttling: 30 } },
        });
        renderPart(<NotifyWhen />, SubscriptionEditorProvider, context);
        fireEvent.change(input("Minimum seconds between notifications"), { target: { value: "" } });
        expect(context.setField).toHaveBeenLastCalledWith("notify", { ...notify, throttling: undefined });
    });

    it("switches to every N seconds and keeps the on-change settings for switching back", () => {
        const onChange = { ...notify, triggers: ["entityCreated" as const], throttling: 30 };
        const context = fakeSubscriptionEditorContext({ values: { ...emptyEditorValues, notify: onChange } });
        renderPart(<NotifyWhen />, SubscriptionEditorProvider, context);
        fireEvent.click(screen.getByText("Every N seconds"));
        expect(context.setField).toHaveBeenLastCalledWith("notify", { ...onChange, kind: "every" });
    });

    it("shows only the interval in every mode and writes it", () => {
        const context = fakeSubscriptionEditorContext({
            values: { ...emptyEditorValues, notify: { ...notify, kind: "every" } },
        });
        renderPart(<NotifyWhen />, SubscriptionEditorProvider, context);
        expect(screen.queryByRole("checkbox")).toBeNull();
        fireEvent.change(input("Seconds between notifications"), { target: { value: "60" } });
        expect(context.setField).toHaveBeenLastCalledWith("notify", { ...notify, kind: "every", seconds: 60 });
    });

    const payload = emptyEditorValues.payload;

    it("writes the format and drops previous values when switching to key-values", () => {
        const values = {
            ...emptyEditorValues,
            payload: { ...payload, format: "normalized" as const, showChanges: true },
        };
        const context = fakeSubscriptionEditorContext({ values });
        renderPart(<Format />, SubscriptionEditorProvider, context);
        fireEvent.click(screen.getByText("Concise"));
        expect(context.setField).toHaveBeenLastCalledWith("payload", { ...values.payload, format: "concise" });
        fireEvent.click(screen.getByText("Key-values"));
        expect(context.setField).toHaveBeenLastCalledWith("payload", {
            ...values.payload,
            format: "keyValues",
            showChanges: false,
        });
    });

    it("disables previous values in key-values and writes the payload flags", () => {
        const keyValues = fakeSubscriptionEditorContext();
        const { unmount } = renderPart(<Payload />, SubscriptionEditorProvider, keyValues);
        expect((screen.getByRole("checkbox", { name: /Include previous values/ }) as HTMLInputElement).disabled).toBe(
            true,
        );
        unmount();
        const values = { ...emptyEditorValues, payload: { ...payload, format: "normalized" as const } };
        const context = fakeSubscriptionEditorContext({ values });
        renderPart(<Payload />, SubscriptionEditorProvider, context);
        fireEvent.click(screen.getByRole("checkbox", { name: /Include previous values/ }));
        expect(context.setField).toHaveBeenLastCalledWith("payload", { ...values.payload, showChanges: true });
        fireEvent.click(screen.getByRole("checkbox", { name: /Include system attributes/ }));
        expect(context.setField).toHaveBeenLastCalledWith("payload", { ...values.payload, sysAttrs: true });
    });

    it("enables the link depth only with a join, and writes the @context", () => {
        const context = fakeSubscriptionEditorContext();
        const { unmount } = renderPart(<Advanced />, SubscriptionEditorProvider, context);
        expect(input("Link depth").disabled).toBe(true);
        fireEvent.change(input("@context for notifications"), { target: { value: "https://example.org/ctx.jsonld" } });
        expect(context.setField).toHaveBeenLastCalledWith("jsonldContext", "https://example.org/ctx.jsonld");
        unmount();
        const values = { ...emptyEditorValues, payload: { ...payload, join: "flat" as const } };
        const joined = fakeSubscriptionEditorContext({ values });
        renderPart(<Advanced />, SubscriptionEditorProvider, joined);
        fireEvent.change(input("Link depth"), { target: { value: "2" } });
        expect(joined.setField).toHaveBeenLastCalledWith("payload", { ...values.payload, joinLevel: 2 });
    });
});
