import { emptyEditorValues } from "@vela-tools/ui";
import { describe, expect, it } from "vitest";
import { toDraftMembers, toEditorValues } from "../../src/bound/subscriptionEditorValues";

describe("toEditorValues", () => {
    it("starts empty, watching the selected attribute", () => {
        expect(toEditorValues(undefined, "peopleCount")).toEqual({
            ...emptyEditorValues,
            notify: { kind: "onChange", triggers: [], throttling: undefined },
            watchedAttributes: ["peopleCount"],
        });
    });

    it("takes every member from the defaults", () => {
        const values = toEditorValues(
            {
                name: "Busy",
                description: "Crowds",
                watchedAttributes: ["peopleCount"],
                notify: { kind: "onChange", triggers: ["entityCreated"], throttling: 30 },
                expiresAt: "2027-01-01T00:00:00.000Z",
                scopeQ: "/Delft/#",
                lang: "nl",
                payload: { format: "concise", pick: ["peopleCount"], showChanges: true, join: "flat", joinLevel: 2 },
                jsonldContext: "https://example.org/ctx.jsonld",
                expandValues: ["category"],
                jsonKeys: ["config"],
                endpoint: { uri: "https://hook.example/notify", accept: "application/ld+json" },
            },
            "ignored",
        );
        expect(values).toEqual({
            name: "Busy",
            description: "Crowds",
            watchedAttributes: ["peopleCount"],
            notify: { kind: "onChange", triggers: ["entityCreated"], throttling: 30 },
            expiresAt: "2027-01-01T00:00:00.000Z",
            scopeQ: "/Delft/#",
            lang: "nl",
            payload: {
                format: "concise",
                pick: ["peopleCount"],
                omit: [],
                showChanges: true,
                sysAttrs: false,
                join: "flat",
                joinLevel: 2,
            },
            jsonldContext: "https://example.org/ctx.jsonld",
            expandValues: ["category"],
            jsonKeys: ["config"],
            endpoint: "https://hook.example/notify",
        });
    });

    it("starts a new subscription in key-values, and keeps the format of an existing one", () => {
        expect(toEditorValues({}, null).payload.format).toBe("keyValues");
        expect(toEditorValues({ payload: { format: "normalized" } }, null).payload.format).toBe("normalized");
    });

    it("reads every N seconds", () => {
        expect(toEditorValues({ notify: { kind: "every", seconds: 60 } }, null).notify).toEqual({
            kind: "every",
            triggers: [],
            seconds: 60,
        });
    });
});

describe("toDraftMembers", () => {
    it("trims text and leaves out empty optional members", () => {
        const values = {
            ...emptyEditorValues,
            name: " Busy ",
            description: "  ",
            scopeQ: " ",
            lang: "",
            jsonldContext: " ",
        };
        expect(toDraftMembers(values, [])).toEqual({
            name: "Busy",
            watchedAttributes: [],
            payload: { format: "keyValues" },
        });
    });

    it("sends the trimmed notification URI, and none when it is empty", () => {
        expect(
            toDraftMembers({ ...emptyEditorValues, endpoint: " https://hook.example/notify " }, []).endpoint,
        ).toEqual({ uri: "https://hook.example/notify" });
        expect(toDraftMembers({ ...emptyEditorValues, endpoint: " " }, [])).not.toHaveProperty("endpoint");
    });

    it("watches the attributes in the conditions when none are picked", () => {
        expect(toDraftMembers(emptyEditorValues, ["status"]).watchedAttributes).toEqual(["status"]);
        expect(
            toDraftMembers({ ...emptyEditorValues, watchedAttributes: ["temperature"] }, ["status"]).watchedAttributes,
        ).toEqual(["temperature"]);
    });

    it("sends on change only with triggers or a throttling", () => {
        const notify = emptyEditorValues.notify;
        expect(toDraftMembers({ ...emptyEditorValues, notify: { ...notify, throttling: 30 } }, []).notify).toEqual({
            kind: "onChange",
            throttling: 30,
        });
        expect(
            toDraftMembers({ ...emptyEditorValues, notify: { ...notify, triggers: ["entityDeleted"] } }, []).notify,
        ).toEqual({
            kind: "onChange",
            triggers: ["entityDeleted"],
        });
    });

    it("sends every N seconds without watched attributes or on-change settings", () => {
        const values = {
            ...emptyEditorValues,
            watchedAttributes: ["temperature"],
            notify: { kind: "every" as const, triggers: ["entityCreated" as const], throttling: 30, seconds: 60 },
        };
        const members = toDraftMembers(values, ["status"]);
        expect(members.notify).toEqual({ kind: "every", seconds: 60 });
        expect(members.watchedAttributes).toEqual([]);
    });

    it("sends every 0 seconds when no interval is typed, so validation reports it", () => {
        const values = { ...emptyEditorValues, notify: { ...emptyEditorValues.notify, kind: "every" as const } };
        expect(toDraftMembers(values, []).notify).toEqual({ kind: "every", seconds: 0 });
    });

    it("keeps the expiry and the other text members", () => {
        const values = {
            ...emptyEditorValues,
            name: "Busy",
            description: "Crowds",
            expiresAt: "2027-01-01T00:00:00.000Z",
            scopeQ: "/Delft/#",
            lang: "nl",
        };
        expect(toDraftMembers(values, [])).toEqual({
            name: "Busy",
            description: "Crowds",
            watchedAttributes: [],
            expiresAt: "2027-01-01T00:00:00.000Z",
            scopeQ: "/Delft/#",
            lang: "nl",
            payload: { format: "keyValues" },
        });
    });

    it("sends only the payload members that are set, and the link depth only with a join", () => {
        const payload = {
            format: "normalized" as const,
            pick: [" status ", ""],
            omit: [],
            showChanges: true,
            sysAttrs: false,
            join: "" as const,
            joinLevel: 2,
        };
        expect(toDraftMembers({ ...emptyEditorValues, payload }, []).payload).toEqual({
            format: "normalized",
            pick: ["status"],
            showChanges: true,
        });
        expect(
            toDraftMembers({ ...emptyEditorValues, payload: { ...payload, join: "inline" } }, []).payload,
        ).toMatchObject({ join: "inline", joinLevel: 2 });
    });

    it("trims the @context and drops empty expandValues and jsonKeys", () => {
        const values = {
            ...emptyEditorValues,
            jsonldContext: " https://example.org/ctx.jsonld ",
            expandValues: ["category"],
            jsonKeys: [],
        };
        const members = toDraftMembers(values, []);
        expect(members).toMatchObject({ jsonldContext: "https://example.org/ctx.jsonld", expandValues: ["category"] });
        expect(members).not.toHaveProperty("jsonKeys");
    });
});
