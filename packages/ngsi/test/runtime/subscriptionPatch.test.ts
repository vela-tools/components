import { describe, expect, it } from "vitest";
import type { Subscription, SubscriptionDraft } from "../../src/types";
import {
    applySubscriptionPatch,
    isEmptyPatch,
    revivesExpired,
    subscriptionPatch,
} from "../../src/runtime/subscriptionPatch";

const original: Subscription = {
    id: "urn:s:1",
    name: "Busy",
    description: "Crowds",
    types: [{ type: "Camera", contextUri: "https://example.org/" }, { type: "Sensor" }],
    watchedAttributes: ["status", "temperature"],
    q: 'status=="offline"',
    geo: { lat: 52.01, lon: 4.36, radiusKm: 2 },
    notify: { kind: "onChange", triggers: ["entityCreated"], throttling: 30 },
    expiresAt: "2027-01-01T00:00:00.000Z",
    status: "active",
    delivery: { timesSent: 3 },
};

const { id: _id, status: _status, delivery: _delivery, ...draft } = original;

describe("subscriptionPatch", () => {
    it("is empty when nothing changed", () => {
        expect(subscriptionPatch(original, draft)).toEqual({});
        expect(isEmptyPatch(subscriptionPatch(original, draft))).toBe(true);
    });

    it("ignores the order of types and watched attributes, and a type without its context", () => {
        const reordered: SubscriptionDraft = {
            ...draft,
            types: [{ type: "Sensor" }, { type: "Camera" }],
            watchedAttributes: ["temperature", "status"],
        };
        expect(subscriptionPatch(original, reordered)).toEqual({});
    });

    it("ignores the label of a geo region, which the broker does not store", () => {
        expect(subscriptionPatch(original, { ...draft, geo: { ...draft.geo!, label: "Delft" } })).toEqual({});
    });

    it("returns only the changed members", () => {
        const changed: SubscriptionDraft = {
            ...draft,
            name: "Very busy",
            notify: { kind: "every", seconds: 60 },
            watchedAttributes: [],
        };
        expect(subscriptionPatch(original, changed)).toEqual({
            name: "Very busy",
            notify: { kind: "every", seconds: 60 },
            watchedAttributes: [],
        });
    });

    it("clears a removed member with null", () => {
        const { description: _d, geo: _g, expiresAt: _e, ...rest } = draft;
        expect(subscriptionPatch(original, rest)).toEqual({ description: null, geo: null, expiresAt: null });
    });

    it("treats an empty text member as absent", () => {
        const { name: _n, ...unnamed } = original;
        expect(subscriptionPatch(unnamed, { ...draft, name: "" })).toEqual({});
        expect(subscriptionPatch(original, { ...draft, description: "" })).toEqual({ description: null });
    });

    it("adds a member the original did not have", () => {
        expect(subscriptionPatch(original, { ...draft, lang: "nl" })).toEqual({ lang: "nl" });
    });
});

describe("applySubscriptionPatch", () => {
    it("replaces, adds and clears members, keeping id, status and delivery", () => {
        const merged = applySubscriptionPatch(original, {
            name: "Very busy",
            lang: "nl",
            geo: null,
            types: [{ type: "Sensor" }],
        });
        expect(merged).toEqual({
            ...original,
            name: "Very busy",
            lang: "nl",
            geo: undefined,
            types: [{ type: "Sensor" }],
        });
        expect(merged).not.toHaveProperty("geo");
    });

    it("brings an expired subscription back with an expiry in the future, as the spec says", () => {
        const now = Date.parse("2026-11-18T12:00:00Z");
        const expired = { ...original, status: "expired" as const };
        expect(applySubscriptionPatch(expired, { expiresAt: "2027-01-01T00:00:00Z" }, now).status).toBe("active");
        expect(applySubscriptionPatch(expired, { name: "Renamed" }, now).status).toBe("expired");
        expect(revivesExpired(expired, { expiresAt: "2027-01-01T00:00:00Z" }, now)).toBe(true);
        expect(revivesExpired(expired, { expiresAt: "2020-01-01T00:00:00Z" }, now)).toBe(false);
        expect(revivesExpired(original, { expiresAt: "2027-01-01T00:00:00Z" }, now)).toBe(false);
    });
});

describe("notification payload members", () => {
    it("treats a missing payload as the normalized default", () => {
        expect(subscriptionPatch(draft, { ...draft, payload: { format: "normalized" } })).toEqual({});
        expect(subscriptionPatch({ ...draft, payload: { format: "normalized" } }, draft)).toEqual({});
    });

    it("sends the whole payload when one of its members changed, and the default when it is removed", () => {
        const before = { ...draft, payload: { format: "keyValues" as const, pick: ["status"] } };
        expect(
            subscriptionPatch(before, { ...before, payload: { format: "keyValues", pick: ["status", "temperature"] } }),
        ).toEqual({
            payload: { format: "keyValues", pick: ["status", "temperature"] },
        });
        expect(subscriptionPatch(before, draft)).toEqual({ payload: { format: "normalized" } });
    });

    it("ignores the order of payload keys", () => {
        const before = { ...draft, payload: { format: "concise" as const, sysAttrs: true, pick: ["a"] } };
        expect(
            subscriptionPatch(before, { ...draft, payload: { pick: ["a"], sysAttrs: true, format: "concise" } }),
        ).toEqual({});
    });

    it("clears expandValues and jsonKeys that were removed or emptied, and never sends jsonldContext", () => {
        const before = {
            ...draft,
            jsonldContext: "https://example.org/ctx.jsonld",
            expandValues: ["category"],
            jsonKeys: ["config"],
        };
        expect(subscriptionPatch(before, { ...draft, expandValues: [] })).toEqual({
            expandValues: null,
            jsonKeys: null,
        });
        expect(subscriptionPatch(draft, { ...draft, jsonldContext: "https://example.org/ctx.jsonld" })).toEqual({});
        expect(subscriptionPatch(draft, { ...draft, expandValues: [] })).toEqual({});
    });

    it("applies the payload, keeps the endpoint and takes a status from the patch", () => {
        const withEndpoint = { ...original, endpoint: { uri: "https://hook.example" } };
        const applied = applySubscriptionPatch(withEndpoint, {
            payload: { format: "concise" },
            jsonKeys: ["config"],
            status: "active",
        });
        expect(applied).toMatchObject({
            payload: { format: "concise" },
            jsonKeys: ["config"],
            endpoint: { uri: "https://hook.example" },
            status: "active",
        });
        expect(
            applySubscriptionPatch({ ...withEndpoint, payload: { format: "concise" } }, { payload: null }),
        ).not.toHaveProperty("payload");
    });
});

describe("notification endpoint", () => {
    const withEndpoint: Subscription = {
        ...original,
        endpoint: { uri: "https://hook.example/a", accept: "application/json" },
    };

    it("sends the URI when it changed, ignoring whitespace and accept", () => {
        expect(subscriptionPatch(withEndpoint, { ...draft, endpoint: { uri: " https://hook.example/a " } })).toEqual(
            {},
        );
        expect(subscriptionPatch(withEndpoint, { ...draft, endpoint: { uri: "https://hook.example/b" } })).toEqual({
            endpoint: { uri: "https://hook.example/b" },
        });
    });

    it("sends an empty URI when it was emptied, so validation reports it", () => {
        expect(subscriptionPatch(withEndpoint, draft)).toEqual({ endpoint: { uri: "" } });
    });

    it("applies a new URI and keeps accept", () => {
        expect(applySubscriptionPatch(withEndpoint, { endpoint: { uri: "https://hook.example/b" } }).endpoint).toEqual({
            uri: "https://hook.example/b",
            accept: "application/json",
        });
    });
});
