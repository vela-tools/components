import { describe, expect, it } from "vitest";
import type { EntityTypeInfo, SubscriptionDraft } from "../../src/types";
import { fixtureEntities, fixtureSavedQueries, fixtureSubscriptions, fixtureTypes } from "../../src/testing/fixtures";
import {
    createSubscriptionDisabled,
    draftIssues,
    entityAttributeNames,
    entityMatchesTypes,
    removeSavedQueryDisabled,
    removeSubscriptionDisabled,
    sameTypeRef,
    saveQueryDisabled,
    selectAttributeDisabled,
    selectTypesDisabled,
    setGeoFilterDisabled,
    setQueryDisabled,
    setSubscriptionStatusDisabled,
    SELECTORS_LOCKED,
    updateIssues,
    updateSavedQueryDisabled,
    updateSubscriptionDisabled,
} from "../../src/runtime/predicates";
import type { SelectionState } from "../../src/runtime/store";

const unselected: SelectionState = { types: [], entityId: null, attribute: null, query: {} };

const known: EntityTypeInfo[] = [
    { type: fixtureTypes.Camera, attributes: [] },
    { type: fixtureTypes.CrowdFlowObserved, attributes: [] },
];

const camera = fixtureEntities.find((e) => e.id === "urn:ngsi-ld:Camera:camera-1")!;

describe("sameTypeRef", () => {
    it("compares full IRIs when both refs have a contextUri", () => {
        expect(sameTypeRef(fixtureTypes.Camera, { type: "Camera", contextUri: fixtureTypes.Camera.contextUri })).toBe(
            true,
        );
        expect(sameTypeRef(fixtureTypes.Camera, { type: "Camera", contextUri: "https://other.example/" })).toBe(false);
    });

    it("falls back to the short name when one ref has no contextUri", () => {
        expect(sameTypeRef(fixtureTypes.Camera, { type: "Camera" })).toBe(true);
        expect(sameTypeRef(fixtureTypes.Camera, { type: "OSMPlace" })).toBe(false);
    });
});

describe("entityMatchesTypes", () => {
    it("matches by short name or full IRI", () => {
        expect(entityMatchesTypes(camera, [fixtureTypes.Camera])).toBe(true);
        expect(
            entityMatchesTypes({ ...camera, type: `${fixtureTypes.Camera.contextUri}Camera` }, [fixtureTypes.Camera]),
        ).toBe(true);
        expect(entityMatchesTypes(camera, [fixtureTypes.OSMPlace])).toBe(false);
        expect(entityMatchesTypes(camera, [])).toBe(false);
    });
});

describe("entityAttributeNames", () => {
    it("lists the attributes without id, type and @context", () => {
        expect(entityAttributeNames(camera)).toEqual(["name", "status", "location"]);
    });

    it("is empty without an entity", () => {
        expect(entityAttributeNames(null)).toEqual([]);
        expect(entityAttributeNames(undefined)).toEqual([]);
    });
});

describe("selectTypesDisabled", () => {
    it("allows anything while the type list is not loaded", () => {
        expect(selectTypesDisabled(undefined, [{ type: "Nope" }])).toBeNull();
    });

    it("allows known types and an empty selection", () => {
        expect(selectTypesDisabled(known, [fixtureTypes.Camera, { type: "CrowdFlowObserved" }])).toBeNull();
        expect(selectTypesDisabled(known, [])).toBeNull();
    });

    it("rejects when any type is unknown", () => {
        expect(selectTypesDisabled(known, [fixtureTypes.Camera, fixtureTypes.OSMPlace])).toBe("unknown-type");
    });
});

describe("selectAttributeDisabled", () => {
    const selected = { ...unselected, entityId: camera.id };

    it("rejects without a selected entity", () => {
        expect(selectAttributeDisabled(unselected, undefined, "status")).toBe("no-entity-selected");
    });

    it("rejects reserved keys", () => {
        expect(selectAttributeDisabled(selected, camera, "id")).toBe("reserved-attribute");
        expect(selectAttributeDisabled(selected, camera, "@context")).toBe("reserved-attribute");
    });

    it("rejects when the entity does not exist", () => {
        expect(selectAttributeDisabled(selected, null, "status")).toBe("entity-not-found");
    });

    it("rejects attributes the entity lacks", () => {
        expect(selectAttributeDisabled(selected, camera, "peopleCount")).toBe("attribute-not-on-entity");
    });

    it("allows attributes the entity has, and any attribute while the entity loads", () => {
        expect(selectAttributeDisabled(selected, camera, "status")).toBeNull();
        expect(selectAttributeDisabled(selected, undefined, "anything")).toBeNull();
    });

    it("checks an explicit entity id instead of the selected one", () => {
        expect(selectAttributeDisabled(unselected, camera, "status", camera.id)).toBeNull();
        expect(selectAttributeDisabled(selected, camera, "status", null)).toBe("no-entity-selected");
        expect(selectAttributeDisabled(unselected, null, "status", "urn:ngsi-ld:Camera:nope")).toBe("entity-not-found");
        expect(selectAttributeDisabled(unselected, camera, "id", camera.id)).toBe("reserved-attribute");
    });
});

const draft: SubscriptionDraft = {
    name: "Crowd flow above 100 people",
    types: [fixtureTypes.CrowdFlowObserved],
    watchedAttributes: ["peopleCount"],
    q: "peopleCount>100",
    endpoint: { uri: "https://hook.example/notify" },
};

const supported = { subscriptions: true };
const unsupported = { subscriptions: false };
const CROWD_HIGH = "urn:ngsi-ld:Subscription:crowd-high";
const CAMERA_FAULTY = "urn:ngsi-ld:Subscription:camera-faulty";

describe("draftIssues", () => {
    const fields = (d: Partial<SubscriptionDraft>, types?: EntityTypeInfo[]) =>
        draftIssues(d, types).map((i) => i.field);

    it("is empty for a complete draft", () => {
        expect(draftIssues(draft, known)).toEqual([]);
    });

    it("lists the required fields of an empty draft with their messages", () => {
        expect(draftIssues({})).toEqual([
            { field: "name", message: "Give the subscription a name." },
            { field: "types", message: "Pick at least one entity type." },
            { field: "endpoint", message: "Give the URI the broker sends notifications to." },
        ]);
    });

    it("requires a notification URI that is an absolute URI", () => {
        expect(fields({ ...draft, endpoint: undefined })).toEqual(["endpoint"]);
        expect(fields({ ...draft, endpoint: { uri: "  " } })).toEqual(["endpoint"]);
        expect(draftIssues({ ...draft, endpoint: { uri: "not a uri" } })).toEqual([
            {
                field: "endpoint",
                message: "The notification URI must be an absolute URI, for example https://example.org/notify.",
            },
        ]);
        expect(fields({ ...draft, endpoint: { uri: " http://receiver:8099/notify/aquila " } })).toEqual([]);
    });

    it("treats whitespace as missing", () => {
        expect(fields({ ...draft, name: "  ", types: [{ type: "\t" }] })).toEqual(["name", "types"]);
    });

    it("requires at least one type", () => {
        expect(fields({ ...draft, types: [] })).toEqual(["types"]);
    });

    it("rejects previous values in the key-values format", () => {
        expect(draftIssues({ ...draft, payload: { format: "keyValues", showChanges: true } }, known)).toEqual([
            { field: "payload", message: "Previous values can't be included in the key-values format." },
        ]);
        expect(fields({ ...draft, payload: { format: "normalized", showChanges: true } }, known)).toEqual([]);
    });

    it("rejects blank payload attributes, a join depth without a join, and any join", () => {
        expect(fields({ ...draft, payload: { format: "normalized", pick: [" "] } }, known)).toEqual(["payload"]);
        expect(fields({ ...draft, payload: { format: "normalized", omit: [""] } }, known)).toEqual(["payload"]);
        expect(fields({ ...draft, payload: { format: "normalized", joinLevel: 2 } }, known)).toEqual(["payload"]);
        expect(
            draftIssues({ ...draft, payload: { format: "normalized", join: "inline", joinLevel: 2 } }, known),
        ).toEqual([{ field: "payload", message: "This broker rejects subscriptions that join linked entities." }]);
    });

    it("requires the @context to be a URI and no blank expandValues or jsonKeys", () => {
        expect(fields({ ...draft, jsonldContext: "context.jsonld" }, known)).toEqual(["jsonldContext"]);
        expect(fields({ ...draft, jsonldContext: "https://example.org/ctx.jsonld" }, known)).toEqual([]);
        expect(fields({ ...draft, expandValues: [""], jsonKeys: [" "] }, known)).toEqual(["expandValues", "jsonKeys"]);
    });

    it("allows no watched attributes, but no blank one", () => {
        expect(fields({ ...draft, watchedAttributes: [] })).toEqual([]);
        expect(fields({ ...draft, watchedAttributes: ["peopleCount", " "] })).toEqual(["watchedAttributes"]);
    });

    it("allows a draft without q", () => {
        const { q: _q, ...withoutQ } = draft;
        expect(fields(withoutQ)).toEqual([]);
    });

    it("flags types the broker does not have, once the type list is loaded", () => {
        const unknown = { ...draft, types: [{ type: "Nope" }] };
        expect(draftIssues(unknown, known)).toEqual([
            { field: "types", message: "One of the selected types is not on this broker." },
        ]);
        expect(fields(unknown)).toEqual([]);
    });

    it("reports a blank type once, not also as unknown", () => {
        expect(fields({ ...draft, types: [{ type: " " }] }, known)).toEqual(["types"]);
    });

    it("flags an invalid geo region", () => {
        expect(fields({ ...draft, geo: { lat: 52, lon: 4, radiusKm: 0 } })).toEqual(["geo"]);
        expect(fields({ ...draft, geo: { lat: 99, lon: 4, radiusKm: 1 } })).toEqual(["geo"]);
    });

    it("reports every issue at once", () => {
        expect(
            fields(
                { name: "", types: [{ type: "Nope" }], watchedAttributes: [""], geo: { lat: 0, lon: 0, radiusKm: -1 } },
                known,
            ),
        ).toEqual(["name", "types", "watchedAttributes", "geo", "endpoint"]);
    });

    it("allows a draft without a description", () => {
        expect(fields({ ...draft, description: "" })).toEqual([]);
    });

    describe("notify", () => {
        const issues = (notify: SubscriptionDraft["notify"], watchedAttributes: string[] = []) =>
            draftIssues({ ...draft, watchedAttributes, notify });

        it("allows on change with triggers and a throttling above 0", () => {
            expect(issues({ kind: "onChange", triggers: ["entityCreated"], throttling: 0.5 }, ["peopleCount"])).toEqual(
                [],
            );
            expect(issues({ kind: "onChange" })).toEqual([]);
        });

        it("rejects a throttling of 0 or less", () => {
            expect(issues({ kind: "onChange", throttling: 0 })).toEqual([
                { field: "notify", message: "The minimum time between notifications must be above 0 seconds." },
            ]);
            expect(issues({ kind: "onChange", throttling: Number.NaN }).map((i) => i.field)).toEqual(["notify"]);
        });

        it("allows every N seconds above 0, without watched attributes", () => {
            expect(issues({ kind: "every", seconds: 60 })).toEqual([]);
        });

        it("rejects every 0 seconds", () => {
            expect(issues({ kind: "every", seconds: 0 })).toEqual([
                { field: "notify", message: "Notify every N seconds needs a number of seconds above 0." },
            ]);
        });

        it("rejects watched attributes together with every N seconds", () => {
            expect(issues({ kind: "every", seconds: 60 }, ["peopleCount"])).toEqual([
                { field: "watchedAttributes", message: "Watched attributes only apply when notifying on change." },
            ]);
        });
    });

    describe("expiresAt", () => {
        const now = Date.parse("2026-11-18T12:00:00Z");
        const issues = (expiresAt: string) => draftIssues({ ...draft, expiresAt }, undefined, now);
        const message = { field: "expiresAt", message: "The expiry must be a date and time in the future." };

        it("allows a time in the future", () => {
            expect(issues("2026-11-18T12:00:01Z")).toEqual([]);
        });

        it("rejects now, the past and a value that is not a date", () => {
            expect(issues("2026-11-18T12:00:00Z")).toEqual([message]);
            expect(issues("2025-01-01T00:00:00Z")).toEqual([message]);
            expect(issues("tomorrow")).toEqual([message]);
        });
    });
});

describe("createSubscriptionDisabled", () => {
    it("rejects without a subscriptions adapter, before looking at the draft", () => {
        expect(createSubscriptionDisabled(unsupported, draft)).toBe("no-subscriptions-adapter");
        expect(createSubscriptionDisabled(unsupported, {})).toBe("no-subscriptions-adapter");
    });

    it("rejects a draft with issues", () => {
        expect(createSubscriptionDisabled(supported, { ...draft, types: [] })).toBe("invalid-draft");
        expect(createSubscriptionDisabled(supported, { ...draft, types: [{ type: "Nope" }] }, known)).toBe(
            "invalid-draft",
        );
        expect(createSubscriptionDisabled(supported, { ...draft, geo: { lat: 52, lon: 4, radiusKm: 0 } })).toBe(
            "invalid-draft",
        );
    });

    it("accepts unknown types while the type list is not loaded", () => {
        expect(createSubscriptionDisabled(supported, { ...draft, types: [{ type: "Nope" }] })).toBeNull();
    });

    it("allows a complete draft with several types and a geo region", () => {
        const full = {
            ...draft,
            types: [fixtureTypes.Camera, fixtureTypes.CrowdFlowObserved],
            geo: { lat: 52, lon: 4, radiusKm: 2 },
        };
        expect(createSubscriptionDisabled(supported, full, known)).toBeNull();
    });
});

describe("updateIssues and updateSubscriptionDisabled", () => {
    const now = Date.parse("2026-11-18T12:00:00Z");
    const original = { ...fixtureSubscriptions[0], name: "Crowd flow" };

    it("allows a valid change", () => {
        expect(updateIssues(original, { name: "Busy" }, known, now)).toEqual([]);
        expect(updateSubscriptionDisabled(supported, original, { name: "Busy" }, known, now)).toBeNull();
    });

    it("reports what the change breaks", () => {
        expect(
            updateIssues(original, { name: " ", expiresAt: "2025-01-01T00:00:00Z" }, known, now).map((i) => i.field),
        ).toEqual(["name", "expiresAt"]);
        expect(
            updateIssues(original, { notify: { kind: "every", seconds: 60 } }, known, now).map((i) => i.field),
        ).toEqual(["watchedAttributes", "notify"]);
        expect(updateSubscriptionDisabled(supported, original, { types: [] }, known, now)).toBe("invalid-draft");
    });

    it("refuses removing a member the subscription has", () => {
        const full = {
            ...original,
            description: "Busy squares",
            q: "peopleCount>100",
            scopeQ: "/Test",
            expiresAt: "2027-01-01T00:00:00Z",
            notify: { kind: "onChange" as const, triggers: ["entityCreated" as const], throttling: 10 },
        };
        const issues = updateIssues(
            full,
            { description: null, q: null, scopeQ: null, expiresAt: null, notify: null },
            known,
            now,
        );
        expect(issues.map((i) => i.field)).toEqual(["description", "q", "scopeQ", "expiresAt", "notify", "notify"]);
        expect(issues[0].message).toBe(
            "This broker can't remove the description from an existing subscription. Delete the subscription and create it again.",
        );
        expect(updateIssues(full, { watchedAttributes: [] }, known, now).map((i) => i.field)).toEqual([
            "watchedAttributes",
        ]);
        expect(
            updateIssues(full, { notify: { kind: "onChange", triggers: ["entityCreated"] } }, known, now).map(
                (i) => i.message,
            ),
        ).toEqual([
            "This broker can't remove the minimum time between notifications from an existing subscription. Delete the subscription and create it again.",
        ]);
        expect(updateIssues({ ...original, description: undefined }, { description: null }, known, now)).toEqual([]);
    });

    it("refuses switching the notify mode and changing lang or jsonldContext", () => {
        const every = { ...original, watchedAttributes: [], notify: { kind: "every" as const, seconds: 30 } };
        expect(updateIssues(every, { notify: { kind: "every", seconds: 60 } }, known, now)).toEqual([]);
        expect(updateIssues(every, { notify: null }, known, now).map((i) => i.field)).toEqual(["notify"]);
        expect(updateIssues(original, { lang: "nl" }, known, now)).toEqual([
            { field: "lang", message: "This broker can't change the language of an existing subscription." },
        ]);
        expect(
            updateIssues(original, { jsonldContext: "https://example.org/ctx.jsonld" }, known, now).map((i) => i.field),
        ).toEqual(["jsonldContext"]);
    });

    it("refuses changing the types of a subscription with id selectors", () => {
        const selected = { ...original, selectors: [{ type: original.types[0], id: "urn:ngsi-ld:Camera:1" }] };
        expect(updateIssues(selected, { types: [{ type: "Sensor" }] }, undefined, now)).toEqual([
            { field: "types", message: SELECTORS_LOCKED },
        ]);
        expect(updateIssues(selected, { description: "Other" }, known, now)).toEqual([]);
    });

    it("refuses changing a field whose broker value could not be read", () => {
        const broken = {
            ...original,
            unreadable: [
                { member: "throttling", field: "notify" as const },
                { member: "isActive", field: "status" as const },
            ],
        };
        expect(updateIssues(broken, { notify: { kind: "onChange", throttling: 5 } }, known, now)).toEqual([
            {
                field: "notify",
                message:
                    "The broker has a value for throttling that can't be read, so it can't be changed here. Delete the subscription and create it again.",
            },
        ]);
        expect(updateIssues(broken, { description: "Other" }, known, now)).toEqual([]);
    });

    it("ignores issues the subscription already had, such as no name or an expiry in the past", () => {
        const external = { ...fixtureSubscriptions[0], status: "expired" as const, expiresAt: "2025-01-01T00:00:00Z" };
        expect(updateIssues(external, { q: "peopleCount>200" }, known, now)).toEqual([]);
    });

    it("rejects without an adapter or a subscription", () => {
        expect(updateSubscriptionDisabled(unsupported, original, {}, known, now)).toBe("no-subscriptions-adapter");
        expect(updateSubscriptionDisabled(supported, null, {}, known, now)).toBe("subscription-not-found");
    });
});

describe("setSubscriptionStatusDisabled", () => {
    it("rejects without a subscriptions adapter", () => {
        expect(setSubscriptionStatusDisabled(unsupported, fixtureSubscriptions, CROWD_HIGH, "paused")).toBe(
            "no-subscriptions-adapter",
        );
    });

    it("allows any id while the list is not loaded", () => {
        expect(setSubscriptionStatusDisabled(supported, undefined, "urn:unknown", "paused")).toBeNull();
    });

    it("rejects an id that is not in the loaded list", () => {
        expect(setSubscriptionStatusDisabled(supported, fixtureSubscriptions, "urn:unknown", "paused")).toBe(
            "subscription-not-found",
        );
    });

    it("rejects the status the subscription already has", () => {
        expect(setSubscriptionStatusDisabled(supported, fixtureSubscriptions, CROWD_HIGH, "active")).toBe(
            "status-unchanged",
        );
        expect(setSubscriptionStatusDisabled(supported, fixtureSubscriptions, CAMERA_FAULTY, "paused")).toBe(
            "status-unchanged",
        );
    });

    it("rejects pausing or resuming an expired subscription", () => {
        const expired = fixtureSubscriptions.map((s) => ({ ...s, status: "expired" as const }));
        expect(setSubscriptionStatusDisabled(supported, expired, CROWD_HIGH, "paused")).toBe("subscription-expired");
        expect(setSubscriptionStatusDisabled(supported, expired, CROWD_HIGH, "active")).toBe("subscription-expired");
    });

    it("allows a status change", () => {
        expect(setSubscriptionStatusDisabled(supported, fixtureSubscriptions, CROWD_HIGH, "paused")).toBeNull();
        expect(setSubscriptionStatusDisabled(supported, fixtureSubscriptions, CAMERA_FAULTY, "active")).toBeNull();
    });
});

describe("removeSubscriptionDisabled", () => {
    it("rejects without a subscriptions adapter", () => {
        expect(removeSubscriptionDisabled(unsupported, fixtureSubscriptions, CROWD_HIGH)).toBe(
            "no-subscriptions-adapter",
        );
    });

    it("allows any id while the list is not loaded", () => {
        expect(removeSubscriptionDisabled(supported, undefined, "urn:unknown")).toBeNull();
    });

    it("rejects an id that is not in the loaded list", () => {
        expect(removeSubscriptionDisabled(supported, fixtureSubscriptions, "urn:unknown")).toBe(
            "subscription-not-found",
        );
    });

    it("allows a subscription in the loaded list", () => {
        expect(removeSubscriptionDisabled(supported, fixtureSubscriptions, CROWD_HIGH)).toBeNull();
    });
});

describe("saved query guards", () => {
    const on = { savedQueries: true };
    const off = { savedQueries: false };
    const saved = fixtureSavedQueries[0];

    it("saveQueryDisabled needs the adapter and a name", () => {
        expect(saveQueryDisabled(off, { name: "A" })).toBe("no-saved-queries-adapter");
        expect(saveQueryDisabled(on, { name: " " })).toBe("blank-name");
        expect(saveQueryDisabled(on, { name: "A" })).toBeNull();
    });

    it("updateSavedQueryDisabled also needs the id in the loaded list, when there is one", () => {
        expect(updateSavedQueryDisabled(on, fixtureSavedQueries, { id: "gone", name: "A" })).toBe(
            "saved-query-not-found",
        );
        expect(updateSavedQueryDisabled(on, fixtureSavedQueries, { id: saved.id, name: "" })).toBe("blank-name");
        expect(updateSavedQueryDisabled(on, undefined, { id: "gone", name: "A" })).toBeNull();
        expect(updateSavedQueryDisabled(off, fixtureSavedQueries, saved)).toBe("no-saved-queries-adapter");
    });

    it("removeSavedQueryDisabled needs the adapter and a known id", () => {
        expect(removeSavedQueryDisabled(on, fixtureSavedQueries, "gone")).toBe("saved-query-not-found");
        expect(removeSavedQueryDisabled(on, fixtureSavedQueries, saved.id)).toBeNull();
        expect(removeSavedQueryDisabled(off, undefined, saved.id)).toBe("no-saved-queries-adapter");
    });
});

describe("setGeoFilterDisabled", () => {
    const geo = { lat: 52.08, lon: 4.31, radiusKm: 2 };

    it("allows a valid filter", () => {
        expect(setGeoFilterDisabled(geo)).toBeNull();
        expect(setGeoFilterDisabled({ lat: -90, lon: 180, radiusKm: 0.001 })).toBeNull();
    });

    it("rejects a radius that is not positive and finite", () => {
        expect(setGeoFilterDisabled({ ...geo, radiusKm: 0 })).toBe("invalid-radius");
        expect(setGeoFilterDisabled({ ...geo, radiusKm: -1 })).toBe("invalid-radius");
        expect(setGeoFilterDisabled({ ...geo, radiusKm: Number.NaN })).toBe("invalid-radius");
        expect(setGeoFilterDisabled({ ...geo, radiusKm: Number.POSITIVE_INFINITY })).toBe("invalid-radius");
    });

    it("rejects coordinates out of range", () => {
        expect(setGeoFilterDisabled({ ...geo, lat: 91 })).toBe("invalid-coordinates");
        expect(setGeoFilterDisabled({ ...geo, lon: -181 })).toBe("invalid-coordinates");
        expect(setGeoFilterDisabled({ ...geo, lat: Number.NaN })).toBe("invalid-coordinates");
    });
});

describe("setQueryDisabled", () => {
    it("allows an empty query and a full valid one", () => {
        expect(setQueryDisabled(known, {})).toBeNull();
        expect(
            setQueryDisabled(known, {
                types: [fixtureTypes.Camera],
                q: 'status=="on"',
                geo: { lat: 52.08, lon: 4.31, radiusKm: 1 },
                limit: 100,
                offset: 0,
            }),
        ).toBeNull();
    });

    it("rejects unknown types once the type list has loaded", () => {
        expect(setQueryDisabled(known, { types: [{ type: "Unknown" }] })).toBe("unknown-type");
        expect(setQueryDisabled(undefined, { types: [{ type: "Unknown" }] })).toBeNull();
    });

    it("rejects a blank q when the key is present", () => {
        expect(setQueryDisabled(known, { q: "" })).toBe("empty-q");
        expect(setQueryDisabled(known, { q: "   " })).toBe("empty-q");
    });

    it("rejects an invalid geo filter", () => {
        expect(setQueryDisabled(known, { geo: { lat: 52, lon: 4, radiusKm: 0 } })).toBe("invalid-geo");
        expect(setQueryDisabled(known, { geo: { lat: 100, lon: 4, radiusKm: 1 } })).toBe("invalid-geo");
    });

    it("rejects limit and offset that are not whole non-negative numbers", () => {
        expect(setQueryDisabled(known, { limit: -1 })).toBe("invalid-paging");
        expect(setQueryDisabled(known, { limit: 1.5 })).toBe("invalid-paging");
        expect(setQueryDisabled(known, { offset: Number.NaN })).toBe("invalid-paging");
        expect(setQueryDisabled(known, { limit: 0, offset: 20 })).toBeNull();
    });
});
