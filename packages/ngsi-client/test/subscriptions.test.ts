import { describe, expect, it, vi } from "vitest";
import { BASE, mockFetch } from "./fixtures/mockFetch";
import subs from "./fixtures/subscriptions.json";
import { createHttp } from "../src/http";
import { createSubscriptionStore } from "../src/subscriptions";
import { NgsiValidationError } from "../src/entities";
import type { NgsiLdClientConfig } from "../src/config";

function store(routes: Parameters<typeof mockFetch>[0], config: Partial<NgsiLdClientConfig> = {}) {
    const fetch = mockFetch(routes);
    const cfg = { url: BASE, fetch, ...config };
    return { s: createSubscriptionStore(createHttp(cfg), cfg), fetch };
}
const sent = (fetch: ReturnType<typeof mockFetch>) => {
    const [url, init] = fetch.mock.calls.at(-1)!;
    return {
        url: new URL(String(url)),
        method: init!.method,
        body: init!.body ? JSON.parse(String(init!.body)) : undefined,
    };
};

describe("subscriptions.list", () => {
    it("maps broker subscriptions to the contract and drops ones without an id", async () => {
        const onInvalid = vi.fn();
        const { s } = store({ "GET /subscriptions": subs }, { onInvalid });
        const list = await s.list();
        expect(list).toEqual([
            {
                id: "urn:ngsi-ld:Subscription:6f1c2a7e",
                description: "Crowd flow above 100 people",
                types: [
                    { type: "CrowdFlowObserved", contextUri: "https://smartdatamodels.org/dataModel.Transportation/" },
                ],
                watchedAttributes: ["peopleCount"],
                q: "peopleCount>100",
                payload: { format: "keyValues" },
                status: "active",
                endpoint: { uri: "https://webhook.example.invalid/scorpiowebhook", accept: "application/json" },
                delivery: { status: "ok", timesSent: 3 },
            },
            {
                id: "urn:ngsi-ld:Subscription:91ab03d4",
                types: [{ type: "Camera" }],
                watchedAttributes: [],
                payload: { format: "normalized" },
                status: "paused",
                endpoint: { uri: "https://webhook.example.invalid/scorpiowebhook" },
            },
        ]);
        expect(onInvalid).toHaveBeenCalledWith(expect.objectContaining({ kind: "subscription", value: subs.body[2] }));
    });

    it("reads every page", async () => {
        const sub = (i: number) => ({ id: `urn:s:${i}`, type: "Subscription" });
        const { s, fetch } = store({
            "GET /subscriptions": (url) => {
                const offset = Number(url.searchParams.get("offset"));
                return {
                    status: 200,
                    headers: {},
                    body: offset === 0 ? Array.from({ length: 50 }, (_, i) => sub(i)) : [sub(50), sub(51)],
                };
            },
        });
        expect(await s.list()).toHaveLength(52);
        expect(fetch.mock.calls.map(([u]) => new URL(String(u)).searchParams.get("limit"))).toEqual(["50", "50"]);
    });

    it("asks for application/ld+json on every page, since Scorpio hangs on application/json for subscriptions", async () => {
        const { s, fetch } = store({ "GET /subscriptions": subs });
        await s.list();
        expect(fetch).toHaveBeenCalled();
        for (const [, init] of fetch.mock.calls)
            expect((init!.headers as Record<string, string>).Accept).toBe("application/ld+json");
    });

    it("ignores the @context that application/ld+json adds to each subscription", async () => {
        const { s } = store({
            "GET /subscriptions": {
                status: 200,
                headers: {},
                body: [
                    {
                        id: "urn:s:1",
                        type: "Subscription",
                        entities: [{ type: "Bus" }],
                        "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld",
                    },
                ],
            },
        });
        expect(await s.list()).toEqual([expect.objectContaining({ id: "urn:s:1", types: [{ type: "Bus" }] })]);
    });

    const listOne = async (raw: Record<string, unknown>) => {
        const { s } = store({ "GET /subscriptions": { status: 200, headers: {}, body: [{ id: "urn:s", ...raw }] } });
        return (await s.list())[0];
    };

    it("reads several types and skips selectors without a type", async () => {
        const sub = await listOne({ entities: [{ type: "Camera" }, { type: "Sensor" }, { idPattern: "urn:x:.*" }] });
        expect(sub.types).toEqual([{ type: "Camera" }, { type: "Sensor" }]);
    });

    it("reads a near-point geoQ, with coordinates as an array or as text", async () => {
        const geo = { lat: 50.02, lon: 10.02, radiusKm: 2 };
        expect(
            (
                await listOne({
                    geoQ: { geometry: "Point", coordinates: [10.02, 50.02], georel: "near;maxDistance==2000" },
                })
            ).geo,
        ).toEqual(geo);
        expect(
            (
                await listOne({
                    geoQ: { geometry: "Point", coordinates: "[10.02,50.02]", georel: "near;maxDistance==2000" },
                })
            ).geo,
        ).toEqual(geo);
    });

    it("reads the name, scope query, expiry and language", async () => {
        const sub = await listOne({
            subscriptionName: "Busy",
            scopeQ: "/CityA/#",
            expiresAt: "2027-01-01T00:00:00Z",
            lang: "nl",
        });
        expect(sub).toMatchObject({ name: "Busy", scopeQ: "/CityA/#", expiresAt: "2027-01-01T00:00:00Z", lang: "nl" });
        expect(sub).not.toHaveProperty("description");
    });

    it("reads triggers and throttling as on change, accepting a compacted single trigger and dropping unknown ones", async () => {
        expect(
            (await listOne({ notificationTrigger: ["entityCreated", "somethingNew"], throttling: 30 })).notify,
        ).toEqual({
            kind: "onChange",
            triggers: ["entityCreated"],
            throttling: 30,
        });
        expect((await listOne({ notificationTrigger: "entityDeleted" })).notify).toEqual({
            kind: "onChange",
            triggers: ["entityDeleted"],
        });
        expect(await listOne({})).not.toHaveProperty("notify");
    });

    it("reads timeInterval as every N seconds", async () => {
        expect((await listOne({ timeInterval: 60 })).notify).toEqual({ kind: "every", seconds: 60 });
    });

    it("accepts compacted single entities and watched attributes", async () => {
        const sub = await listOne({ entities: { type: "Camera" }, watchedAttributes: "status" });
        expect(sub).toMatchObject({ types: [{ type: "Camera" }], watchedAttributes: ["status"] });
    });

    it("reads an expired subscription as expired, even when inactive", async () => {
        expect((await listOne({ status: "expired" })).status).toBe("expired");
        expect((await listOne({ status: "expired", isActive: false })).status).toBe("expired");
    });

    it("reads the delivery state from notification", async () => {
        const notification = {
            status: "failed",
            timesSent: 7,
            timesFailed: 2,
            lastNotification: "2026-11-18T10:00:00Z",
            lastSuccess: "2026-11-18T09:00:00Z",
            lastFailure: "2026-11-18T10:00:00Z",
            endpoint: { uri: "https://hook.example" },
        };
        const { endpoint: _endpoint, ...delivery } = notification;
        expect((await listOne({ notification })).delivery).toEqual(delivery);
    });

    it("ignores a delivery status other than ok or failed, and leaves out empty delivery state", async () => {
        expect((await listOne({ notification: { status: "pending", timesSent: 1 } })).delivery).toEqual({
            timesSent: 1,
        });
        expect(await listOne({ notification: { endpoint: { uri: "https://hook.example" } } })).not.toHaveProperty(
            "delivery",
        );
    });

    it("reads the notification payload, with simplified as key-values and attributes as pick", async () => {
        const sub = await listOne({
            notification: {
                format: "simplified",
                attributes: "temperature",
                omit: ["id"],
                showChanges: true,
                sysAttrs: true,
                join: "inline",
                joinLevel: 2,
                endpoint: {
                    uri: "https://hook.example",
                    accept: "application/ld+json",
                    receiverInfo: [{ key: "Authorization", value: "secret" }],
                },
            },
        });
        expect(sub.payload).toEqual({
            format: "keyValues",
            pick: ["temperature"],
            omit: ["id"],
            showChanges: true,
            sysAttrs: true,
            join: "inline",
            joinLevel: 2,
        });
        expect(sub.endpoint).toEqual({ uri: "https://hook.example", accept: "application/ld+json" });
    });

    it("prefers pick over attributes, defaults to normalized, and ignores join @none and an unknown format", async () => {
        const sub = await listOne({
            notification: {
                pick: ["a"],
                attributes: ["b"],
                join: "@none",
                joinLevel: 2,
                endpoint: { uri: "https://hook.example" },
            },
        });
        expect(sub.payload).toEqual({ format: "normalized", pick: ["a"] });
        expect(
            (await listOne({ notification: { format: "fancy", endpoint: { uri: "https://hook.example" } } })).payload,
        ).toEqual({ format: "normalized" });
        expect(await listOne({})).not.toHaveProperty("payload");
    });

    it("reads jsonldContext, expandValues and jsonKeys, accepting compacted single values", async () => {
        const sub = await listOne({
            jsonldContext: "https://example.org/ctx.jsonld",
            expandValues: "category",
            jsonKeys: ["config"],
        });
        expect(sub).toMatchObject({
            jsonldContext: "https://example.org/ctx.jsonld",
            expandValues: ["category"],
            jsonKeys: ["config"],
        });
    });

    it("keeps a subscription whose geoQ it cannot show, without geo", async () => {
        const sub = await listOne({
            geoQ: {
                geometry: "Polygon",
                coordinates: [
                    [
                        [0, 0],
                        [1, 0],
                        [1, 1],
                        [0, 0],
                    ],
                ],
                georel: "within",
            },
        });
        expect(sub).toMatchObject({ id: "urn:s" });
        expect(sub).not.toHaveProperty("geo");
    });
});

describe("subscriptions.create", () => {
    const draft = {
        name: "Busy",
        description: "Crowds",
        types: [{ type: "CrowdFlowObserved" }],
        watchedAttributes: ["peopleCount"],
        q: "peopleCount>100",
        endpoint: { uri: "https://hook.example/scorpiowebhook" },
    };
    const created = () => store({ "POST /subscriptions": { status: 201, headers: {}, body: null } });

    it("POSTs a subscription that notifies the endpoint of the draft, without receiverInfo", async () => {
        const { s, fetch } = created();
        const result = await s.create(draft);
        const req = sent(fetch);
        expect(req.method).toBe("POST");
        expect(req.body).toEqual({
            id: result.id,
            type: "Subscription",
            subscriptionName: "Busy",
            description: "Crowds",
            entities: [{ type: "CrowdFlowObserved" }],
            watchedAttributes: ["peopleCount"],
            q: "peopleCount>100",
            notification: { endpoint: { uri: "https://hook.example/scorpiowebhook", accept: "application/json" } },
        });
        expect(result).toMatchObject({
            ...draft,
            status: "active",
            endpoint: { uri: "https://hook.example/scorpiowebhook", accept: "application/json" },
            delivery: { timesSent: 0 },
        });
        expect(result.id).toMatch(/^urn:ngsi-ld:Subscription:/);
    });

    it("sends several types, full type IRIs when known, and a geoQ", async () => {
        const { s, fetch } = created();
        await s.create({
            ...draft,
            types: [
                { type: "Camera", contextUri: "https://smartdatamodels.org/dataModel.Device/" },
                { type: "Sensor" },
            ],
            geo: { lat: 50.02, lon: 10.02, radiusKm: 2.5 },
        });
        expect(sent(fetch).body).toMatchObject({
            entities: [{ type: "https://smartdatamodels.org/dataModel.Device/Camera" }, { type: "Sensor" }],
            geoQ: { geometry: "Point", coordinates: [10.02, 50.02], georel: "near;maxDistance==2500" },
        });
    });

    it("omits q, watchedAttributes and geoQ when there are none", async () => {
        const { s, fetch } = created();
        await s.create({
            name: "Any change",
            types: [{ type: "Camera" }],
            watchedAttributes: [],
            q: "  ",
            scopeQ: " ",
            endpoint: draft.endpoint,
        });
        const { body } = sent(fetch);
        for (const member of [
            "description",
            "scopeQ",
            "notificationTrigger",
            "throttling",
            "timeInterval",
            "expiresAt",
            "lang",
        ]) {
            expect(body).not.toHaveProperty(member);
        }
        expect(body).not.toHaveProperty("q");
        expect(body).not.toHaveProperty("watchedAttributes");
        expect(body).not.toHaveProperty("geoQ");
    });

    it("sends on change as notificationTrigger and throttling, and the other plain members", async () => {
        const { s, fetch } = created();
        await s.create({
            ...draft,
            notify: { kind: "onChange", triggers: ["entityCreated", "attributeUpdated"], throttling: 30 },
            expiresAt: "2027-01-01T00:00:00.000Z",
            scopeQ: " /CityA/# ",
            lang: "nl",
        });
        expect(sent(fetch).body).toMatchObject({
            notificationTrigger: ["entityCreated", "attributeUpdated"],
            throttling: 30,
            expiresAt: "2027-01-01T00:00:00.000Z",
            scopeQ: "/CityA/#",
            lang: "nl",
        });
    });

    it("sends the payload in notification and the payload members at the top level", async () => {
        const { s, fetch } = created();
        await s.create({
            ...draft,
            payload: {
                format: "normalized",
                pick: ["peopleCount"],
                omit: [],
                showChanges: true,
                sysAttrs: false,
                join: "flat",
                joinLevel: 2,
            },
            jsonldContext: " https://example.org/ctx.jsonld ",
            expandValues: ["category"],
            jsonKeys: [],
        });
        const { body } = sent(fetch);
        expect(body.notification).toEqual({
            format: "normalized",
            pick: ["peopleCount"],
            showChanges: true,
            join: "flat",
            joinLevel: 2,
            endpoint: { uri: "https://hook.example/scorpiowebhook", accept: "application/json" },
        });
        expect(body).toMatchObject({ jsonldContext: "https://example.org/ctx.jsonld", expandValues: ["category"] });
        expect(body).not.toHaveProperty("jsonKeys");
    });

    it("sends every N seconds as timeInterval only", async () => {
        const { s, fetch } = created();
        await s.create({ ...draft, watchedAttributes: [], notify: { kind: "every", seconds: 60 } });
        const { body } = sent(fetch);
        expect(body.timeInterval).toBe(60);
        expect(body).not.toHaveProperty("notificationTrigger");
        expect(body).not.toHaveProperty("throttling");
        expect(body).not.toHaveProperty("watchedAttributes");
    });

    it("round-trips through list", async () => {
        let posted: unknown;
        const fetch = mockFetch({
            "POST /subscriptions": (_url, init) => {
                posted = JSON.parse(String(init?.body));
                return { status: 201, headers: {}, body: null };
            },
            "GET /subscriptions": () => ({ status: 200, headers: {}, body: [posted] }),
        });
        const cfg = { url: BASE, fetch };
        const s = createSubscriptionStore(createHttp(cfg), cfg);
        const full = {
            ...draft,
            types: [{ type: "Camera" }, { type: "Sensor" }],
            geo: { lat: 50.02, lon: 10.02, radiusKm: 2 },
            notify: { kind: "onChange" as const, triggers: ["entityCreated" as const], throttling: 30 },
            expiresAt: "2027-01-01T00:00:00.000Z",
            scopeQ: "/CityA/#",
            lang: "nl",
            payload: { format: "concise" as const, omit: ["status"], sysAttrs: true },
            jsonldContext: "https://example.org/ctx.jsonld",
            expandValues: ["category"],
            jsonKeys: ["config"],
            endpoint: { uri: "https://hook.example" },
        };
        const result = await s.create(full);
        expect(await s.list()).toEqual([
            {
                ...full,
                id: result.id,
                status: "active",
                endpoint: { uri: "https://hook.example", accept: "application/json" },
            },
        ]);
    });

    it("sends the accept of the draft endpoint", async () => {
        const { s, fetch } = created();
        const result = await s.create({
            ...draft,
            endpoint: { uri: " https://hook.example/ld ", accept: "application/ld+json" },
        });
        expect(sent(fetch).body.notification).toEqual({
            endpoint: { uri: "https://hook.example/ld", accept: "application/ld+json" },
        });
        expect(result.endpoint).toEqual({ uri: "https://hook.example/ld", accept: "application/ld+json" });
    });

    it("refuses to create without a notification endpoint URI, before any request", async () => {
        const { s, fetch } = store({});
        const { endpoint: _endpoint, ...withoutEndpoint } = draft;
        await expect(s.create(withoutEndpoint)).rejects.toThrow("notification endpoint URI");
        await expect(s.create({ ...draft, endpoint: { uri: "  " } })).rejects.toThrow("notification endpoint URI");
        expect(fetch).not.toHaveBeenCalled();
    });

    it("throws the broker error", async () => {
        const { s } = store({
            "POST /subscriptions": {
                status: 400,
                headers: {},
                body: { type: "https://uri.etsi.org/ngsi-ld/errors/BadRequestData", detail: "bad q" },
            },
        });
        await expect(s.create(draft)).rejects.toMatchObject({ status: 400, detail: "bad q" });
    });
});

describe("subscriptions.get", () => {
    it("reads one subscription as application/ld+json", async () => {
        const { s, fetch } = store({
            "GET /subscriptions/urn:s:1": {
                status: 200,
                headers: {},
                body: { id: "urn:s:1", subscriptionName: "Busy", entities: [{ type: "Camera" }] },
            },
        });
        expect(await s.get("urn:s:1")).toMatchObject({ id: "urn:s:1", name: "Busy", types: [{ type: "Camera" }] });
        const [, init] = fetch.mock.calls.at(-1)!;
        expect((init!.headers as Record<string, string>).Accept).toBe("application/ld+json");
    });

    it("returns null when the broker does not have it", async () => {
        const { s } = store({});
        expect(await s.get("urn:s:404")).toBeNull();
    });

    it("reports and throws a malformed subscription", async () => {
        const onInvalid = vi.fn();
        const { s } = store(
            { "GET /subscriptions/urn:s:1": { status: 200, headers: {}, body: { type: "Subscription" } } },
            { onInvalid },
        );
        await expect(s.get("urn:s:1")).rejects.toThrow("can't be read");
        expect(onInvalid).toHaveBeenCalledWith(expect.objectContaining({ kind: "subscription" }));
    });
});

describe("entity selectors", () => {
    it("reads id and idPattern selectors and lists each type once", async () => {
        const raw = {
            id: "urn:s:sel",
            type: "Subscription",
            entities: [
                { type: "WaterQualityObserved", id: "urn:ngsi-ld:WaterQualityObserved:m1" },
                { type: "WaterQualityObserved", idPattern: "urn:ngsi-ld:WaterQualityObserved:x.*" },
                { type: "Camera" },
            ],
            notification: { endpoint: { uri: "https://hook.example/notify" } },
        };
        const { s } = store({ "GET /subscriptions": { status: 200, headers: {}, body: [raw] } });
        const [subscription] = await s.list();
        expect(subscription.types.map((t) => t.type)).toEqual(["WaterQualityObserved", "Camera"]);
        expect(subscription.selectors).toEqual([
            { type: { type: "WaterQualityObserved" }, id: "urn:ngsi-ld:WaterQualityObserved:m1" },
            { type: { type: "WaterQualityObserved" }, idPattern: "urn:ngsi-ld:WaterQualityObserved:x.*" },
        ]);
    });
});

describe("unreadable members", () => {
    const raw = {
        id: "urn:s:bad",
        type: "Subscription",
        subscriptionName: "Broken",
        description: 7,
        entities: [{ type: "Camera" }],
        watchedAttributes: ["pH"],
        throttling: "abc",
        isActive: "yes",
        notification: { endpoint: { uri: "https://hook.example/notify" }, format: "keyValues", timesSent: "many" },
    };

    it("keeps the subscription and names what could not be read", async () => {
        const onInvalid = vi.fn();
        const { s } = store({ "GET /subscriptions": { status: 200, headers: {}, body: [raw] } }, { onInvalid });
        const [subscription] = await s.list();
        expect(subscription).toMatchObject({
            id: "urn:s:bad",
            name: "Broken",
            status: "active",
            payload: { format: "keyValues" },
        });
        expect(subscription).not.toHaveProperty("description");
        expect(subscription.notify).toBeUndefined();
        expect(subscription.unreadable).toEqual([
            { member: "description", field: "description" },
            { member: "throttling", field: "notify" },
            { member: "isActive", field: "status" },
            { member: "notification.timesSent", field: "delivery" },
        ]);
        expect(onInvalid).toHaveBeenCalledTimes(4);
    });

    it("marks a geoQ other than near;maxDistance around a Point on location as unreadable", async () => {
        const geoQs = [
            {
                geometry: "Polygon",
                coordinates: [
                    [
                        [10, 50],
                        [10.1, 50],
                        [10.1, 50.1],
                        [10, 50],
                    ],
                ],
                georel: "within",
            },
            { geometry: "Point", coordinates: [10, 50], georel: "near;minDistance==100" },
            {
                geometry: "Point",
                coordinates: [10, 50],
                georel: "near;maxDistance==100",
                geoproperty: "observationSpace",
            },
        ];
        for (const geoQ of geoQs) {
            const onInvalid = vi.fn();
            const { s } = store(
                {
                    "GET /subscriptions": {
                        status: 200,
                        headers: {},
                        body: [{ id: "urn:s:geo", entities: [{ type: "Camera" }], geoQ }],
                    },
                },
                { onInvalid },
            );
            const [subscription] = await s.list();
            expect(subscription).not.toHaveProperty("geo");
            expect(subscription.unreadable).toEqual([{ member: "geoQ", field: "geo" }]);
            expect(onInvalid).toHaveBeenCalledTimes(1);
        }
    });

    it("still drops a subscription without an id", async () => {
        const { s } = store({ "GET /subscriptions": { status: 200, headers: {}, body: [{ ...raw, id: 5 }] } });
        expect(await s.list()).toEqual([]);
    });
});

describe("subscriptions.update", () => {
    const patched = () => store({ "PATCH /subscriptions/urn:s:1": { status: 204, headers: {}, body: null } });

    it("PATCHes only the members in the patch, translated like create", async () => {
        const { s, fetch } = patched();
        await s.update("urn:s:1", {
            name: "Busy",
            types: [{ type: "Camera", contextUri: "https://example.org/" }],
            geo: { lat: 50.02, lon: 10.02, radiusKm: 2 },
        });
        expect(sent(fetch)).toMatchObject({ method: "PATCH" });
        expect(sent(fetch).body).toEqual({
            subscriptionName: "Busy",
            entities: [{ type: "https://example.org/Camera" }],
            geoQ: { geometry: "Point", coordinates: [10.02, 50.02], georel: "near;maxDistance==2000" },
        });
    });

    it("refuses a patch that removes a member, without sending anything", async () => {
        const { s, fetch } = patched();
        for (const patch of [
            { description: null },
            { q: " " },
            { geo: null },
            { expiresAt: null },
            { watchedAttributes: [] },
            { notify: null },
            { jsonKeys: null },
        ]) {
            await expect(s.update("urn:s:1", patch)).rejects.toBeInstanceOf(NgsiValidationError);
        }
        expect(fetch).not.toHaveBeenCalled();
    });

    it("sends only the members of the notify mode", async () => {
        const { s, fetch } = patched();
        await s.update("urn:s:1", { notify: { kind: "every", seconds: 60 } });
        expect(sent(fetch).body).toEqual({ timeInterval: 60 });
        await s.update("urn:s:1", { notify: { kind: "onChange", triggers: ["entityCreated"], throttling: 5 } });
        expect(sent(fetch).body).toEqual({ notificationTrigger: ["entityCreated"], throttling: 5 });
    });

    it("sends a status change as isActive", async () => {
        const { s, fetch } = patched();
        await s.update("urn:s:1", { expiresAt: "2027-01-01T00:00:00Z", status: "active" });
        expect(sent(fetch).body).toEqual({ expiresAt: "2027-01-01T00:00:00Z", isActive: true });
    });

    it("sends jsonldContext, expandValues and jsonKeys", async () => {
        const { s, fetch } = patched();
        await s.update("urn:s:1", {
            jsonldContext: "https://example.org/ctx.jsonld",
            expandValues: ["category"],
            jsonKeys: ["config"],
        });
        expect(sent(fetch).body).toEqual({
            jsonldContext: "https://example.org/ctx.jsonld",
            expandValues: ["category"],
            jsonKeys: ["config"],
        });
    });

    const current = {
        id: "urn:s:1",
        type: "Subscription",
        notification: {
            format: "keyValues",
            attributes: ["temperature"],
            showChanges: false,
            endpoint: {
                uri: "https://hook.example",
                accept: "application/json",
                receiverInfo: [{ key: "Authorization", value: "secret" }],
            },
            timesSent: 4,
            lastSuccess: "2026-11-18T09:00:00Z",
            status: "ok",
        },
    };
    const withCurrent = (body: unknown = current) =>
        store({
            "GET /subscriptions/urn:s:1": { status: 200, headers: {}, body },
            "PATCH /subscriptions/urn:s:1": { status: 204, headers: {}, body: null },
        });

    it("resends the whole notification with the new payload, keeping the endpoint and leaving out the delivery state", async () => {
        const { s, fetch } = withCurrent();
        await s.update("urn:s:1", {
            name: "Hot",
            payload: { format: "normalized", pick: ["status"], showChanges: true },
        });
        const [get] = fetch.mock.calls;
        expect(get[1]!.method).toBe("GET");
        expect((get[1]!.headers as Record<string, string>).Accept).toBe("application/ld+json");
        expect(sent(fetch)).toMatchObject({ method: "PATCH" });
        expect(sent(fetch).body).toEqual({
            subscriptionName: "Hot",
            notification: {
                format: "normalized",
                pick: ["status"],
                showChanges: true,
                endpoint: current.notification.endpoint,
            },
        });
    });

    it("resends the notification without payload members when the payload is cleared", async () => {
        const { s, fetch } = withCurrent();
        await s.update("urn:s:1", { payload: null });
        expect(sent(fetch).body).toEqual({ notification: { endpoint: current.notification.endpoint } });
    });

    it("resends the notification with the new endpoint URI, keeping the payload, accept and receiverInfo", async () => {
        const { s, fetch } = withCurrent();
        await s.update("urn:s:1", { endpoint: { uri: "https://other.example/notify" } });
        expect(sent(fetch).body).toEqual({
            notification: {
                format: "keyValues",
                attributes: ["temperature"],
                showChanges: false,
                endpoint: { ...current.notification.endpoint, uri: "https://other.example/notify" },
            },
        });
    });

    it("changes the endpoint URI and the payload in one PATCH", async () => {
        const { s, fetch } = withCurrent();
        await s.update("urn:s:1", {
            endpoint: { uri: "https://other.example/notify" },
            payload: { format: "normalized" },
        });
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(sent(fetch).body).toEqual({
            notification: {
                format: "normalized",
                endpoint: { ...current.notification.endpoint, uri: "https://other.example/notify" },
            },
        });
    });

    it("refuses a blank endpoint URI before any request", async () => {
        const { s, fetch } = withCurrent();
        await expect(s.update("urn:s:1", { endpoint: { uri: " " } })).rejects.toThrow("notification endpoint URI");
        expect(fetch).not.toHaveBeenCalled();
    });

    it("does not read the subscription when the payload is unchanged", async () => {
        const { s, fetch } = withCurrent();
        await s.update("urn:s:1", { name: "Hot" });
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("refuses to change the payload of a subscription without a notification endpoint, before the PATCH", async () => {
        const { s, fetch } = withCurrent({ id: "urn:s:1", type: "Subscription" });
        await expect(s.update("urn:s:1", { payload: { format: "normalized" } })).rejects.toThrow(
            "no notification endpoint",
        );
        expect(fetch.mock.calls.map(([, init]) => init!.method)).toEqual(["GET"]);
    });

    it("throws the broker error", async () => {
        const { s } = store({
            "PATCH /subscriptions/urn:s:1": {
                status: 400,
                headers: {},
                body: { type: "https://uri.etsi.org/ngsi-ld/errors/BadRequestData", detail: "expiresAt in the past" },
            },
        });
        await expect(s.update("urn:s:1", { expiresAt: "2020-01-01T00:00:00Z" })).rejects.toMatchObject({ status: 400 });
    });
});

describe("subscriptions.setStatus and remove", () => {
    it("PATCHes isActive", async () => {
        const { s, fetch } = store({ "PATCH /subscriptions/urn:s:1": { status: 204, headers: {}, body: null } });
        await s.setStatus("urn:s:1", "paused");
        expect(sent(fetch)).toMatchObject({ method: "PATCH", body: { isActive: false } });
        await s.setStatus("urn:s:1", "active");
        expect(sent(fetch).body).toEqual({ isActive: true });
    });

    it("DELETEs, and throws when the subscription is gone", async () => {
        const { s, fetch } = store({ "DELETE /subscriptions/urn:s:1": { status: 204, headers: {}, body: null } });
        await s.remove("urn:s:1");
        expect(sent(fetch).method).toBe("DELETE");
        await expect(s.remove("urn:s:2")).rejects.toMatchObject({ status: 404 });
    });
});
