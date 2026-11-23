import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockNgsiAdapter, defaultMockFixtures, MockAdapterError } from "../../src/testing/createMockNgsiAdapter";
import { fixtureTypes } from "../../src/testing/fixtures";

afterEach(() => vi.useRealTimers());

describe("entities", () => {
    it("derives types with contextUri, attribute kinds and counts", async () => {
        const types = await createMockNgsiAdapter().entities.listTypes();
        const crowd = types.find((t) => t.type.type === "CrowdFlowObserved")!;
        expect(crowd.type).toEqual(fixtureTypes.CrowdFlowObserved);
        expect(crowd.count).toBe(3);
        expect(crowd.attributes).toContainEqual({ name: "peopleCount", kind: "Property" });
        expect(crowd.attributes).toContainEqual({ name: "refSensor", kind: "Relationship" });
        expect(crowd.attributes).toContainEqual({ name: "location", kind: "GeoProperty" });
    });

    it("filters by type ref (short name or full IRI)", async () => {
        const { entities } = createMockNgsiAdapter();
        expect((await entities.queryEntities({ types: [fixtureTypes.Camera] })).total).toBe(2);
        expect((await entities.queryEntities({ types: [{ type: "Camera" }] })).total).toBe(2);
        expect((await entities.queryEntities({ types: [{ type: "Nope" }] })).entities).toEqual([]);
    });

    it("filters by q, including multi-instance attributes", async () => {
        const { entities } = createMockNgsiAdapter();
        const faulty = await entities.queryEntities({ q: 'status=="faulty"' });
        expect(faulty.entities.map((e) => e.id)).toEqual(["urn:ngsi-ld:Camera:camera-2"]);
        const busy = await entities.queryEntities({ types: [fixtureTypes.CrowdFlowObserved], q: "peopleCount>100" });
        expect(busy.entities.map((e) => e.id)).toEqual(["urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1"]);
        const both = await entities.queryEntities({ q: "occupancy>=0.2;occupancy<0.5" });
        expect(both.total).toBe(2);
    });

    it("rejects q it cannot parse", async () => {
        await expect(createMockNgsiAdapter().entities.queryEntities({ q: "(((" })).rejects.toThrow(
            "unsupported q term",
        );
    });

    it("filters by geo radius over points, lines and polygons", async () => {
        const { entities } = createMockNgsiAdapter();
        const nearCentre = await entities.queryEntities({ geo: { lat: 52.0705, lon: -25.6993, radiusKm: 0.5 } });
        expect(nearCentre.entities.map((e) => e.id).sort()).toEqual([
            "urn:ngsi-ld:Camera:camera-2",
            "urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1",
            "urn:ngsi-ld:VirtualCameraSensor:camera-2-line-1",
        ]);
        const pier = await entities.queryEntities({ geo: { lat: 52.1155, lon: -25.743, radiusKm: 0.3 } });
        expect(pier.entities.map((e) => e.id)).toEqual(["urn:ngsi-ld:OSMPlace:example-pier"]);
    });

    it("pages with limit/offset and reports the total", async () => {
        const { entities } = createMockNgsiAdapter();
        const page = await entities.queryEntities({ limit: 2, offset: 1 });
        expect(page.entities).toHaveLength(2);
        expect(page.total).toBe(9);
    });

    it("gets one entity or null", async () => {
        const { entities } = createMockNgsiAdapter();
        expect((await entities.getEntity("urn:ngsi-ld:Camera:camera-1"))?.type).toBe("Camera");
        expect(await entities.getEntity("urn:ngsi-ld:Camera:nope")).toBeNull();
    });

    it("returns copies, so callers cannot change the store", async () => {
        const { entities } = createMockNgsiAdapter();
        const e = (await entities.getEntity("urn:ngsi-ld:Camera:camera-1"))!;
        e.type = "Changed";
        expect((await entities.getEntity("urn:ngsi-ld:Camera:camera-1"))!.type).toBe("Camera");
    });
});

describe("latency, abort and failures", () => {
    it("waits latencyMs before resolving", async () => {
        vi.useFakeTimers();
        const p = createMockNgsiAdapter(undefined, { latencyMs: 500 }).entities.getEntity(
            "urn:ngsi-ld:Camera:camera-1",
        );
        let done = false;
        void p.then(() => {
            done = true;
        });
        await vi.advanceTimersByTimeAsync(499);
        expect(done).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(done).toBe(true);
    });

    it("rejects with AbortError when the signal aborts during latency", async () => {
        vi.useFakeTimers();
        const ac = new AbortController();
        const p = createMockNgsiAdapter(undefined, { latencyMs: 1000 }).entities.listTypes({ signal: ac.signal });
        ac.abort();
        await expect(p).rejects.toMatchObject({ name: "AbortError" });
    });

    it("rejects immediately for an already aborted signal", async () => {
        const ac = new AbortController();
        ac.abort();
        await expect(createMockNgsiAdapter().entities.listTypes({ signal: ac.signal })).rejects.toMatchObject({
            name: "AbortError",
        });
    });

    it("fails the listed methods", async () => {
        const a = createMockNgsiAdapter(undefined, { failOn: ["entities.queryEntities"] });
        await expect(a.entities.queryEntities({})).rejects.toBeInstanceOf(MockAdapterError);
        await expect(a.entities.listTypes()).resolves.toBeDefined();
    });

    it("fails via a predicate, with a custom error", async () => {
        const a = createMockNgsiAdapter(undefined, {
            failOn: (method, args) => method === "entities.getEntity" && args[0] === "boom" && new Error("broker down"),
        });
        await expect(a.entities.getEntity("boom")).rejects.toThrow("broker down");
        await expect(a.entities.getEntity("urn:ngsi-ld:Camera:camera-1")).resolves.not.toBeNull();
    });
});

describe("capabilities", () => {
    it("includes every optional adapter by default and omits the disabled ones", () => {
        const all = createMockNgsiAdapter();
        expect(Object.keys(all).sort()).toEqual([
            "entities",
            "live",
            "notifications",
            "savedQueries",
            "subscriptions",
            "temporal",
        ]);
        const some = createMockNgsiAdapter(undefined, { capabilities: { subscriptions: false, live: false } });
        expect(some.subscriptions).toBeUndefined();
        expect(some.live).toBeUndefined();
        expect(some.notifications).toBeDefined();
    });
});

describe("subscriptions", () => {
    it("creates, lists, toggles and removes", async () => {
        const s = createMockNgsiAdapter().subscriptions!;
        const created = await s.create({
            description: "test",
            types: [{ type: "Camera" }],
            watchedAttributes: ["status"],
        });
        expect(created).toMatchObject({ status: "active", delivery: { timesSent: 0 } });
        expect((await s.list()).map((x) => x.id)).toContain(created.id);
        await s.setStatus(created.id, "paused");
        expect((await s.list()).find((x) => x.id === created.id)?.status).toBe("paused");
        await s.remove(created.id);
        expect((await s.list()).map((x) => x.id)).not.toContain(created.id);
    });

    it("gets one by id, null when unknown, and applies a patch", async () => {
        const s = createMockNgsiAdapter().subscriptions!;
        const id = "urn:ngsi-ld:Subscription:crowd-high";
        await s.update(id, { name: "Busy", q: null });
        const updated = await s.get(id);
        expect(updated).toMatchObject({ id, name: "Busy" });
        expect(updated).not.toHaveProperty("q");
        expect(await s.get("nope")).toBeNull();
        await expect(s.update("nope", { name: "x" })).rejects.toThrow("not found");
    });

    it("throws for an unknown id", async () => {
        await expect(createMockNgsiAdapter().subscriptions!.setStatus("nope", "paused")).rejects.toThrow("not found");
    });
});

describe("notifications", () => {
    it("filters by subscription, newest first, with a limit", async () => {
        const list = await createMockNgsiAdapter().notifications!.list({
            subscriptionId: "urn:ngsi-ld:Subscription:crowd-high",
            limit: 2,
        });
        expect(list.map((n) => n.id)).toEqual(["urn:ngsi-ld:Notification:3", "urn:ngsi-ld:Notification:2"]);
    });
});

describe("temporal", () => {
    const entityId = "urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1";

    it("returns the instances in the time range", async () => {
        const h = await createMockNgsiAdapter().temporal!.history({
            entityId,
            attrs: ["occupancy"],
            from: "2026-11-10T08:00:00Z",
            to: "2026-11-10T10:00:00Z",
        });
        expect((h.occupancy as unknown[]).length).toBe(3);
    });

    it("keeps only the last N", async () => {
        const h = await createMockNgsiAdapter().temporal!.history({
            entityId,
            attrs: ["occupancy"],
            from: "2026-01-01T00:00:00Z",
            to: "2027-01-01T00:00:00Z",
            lastN: 2,
        });
        expect(h.occupancy).toEqual([
            expect.objectContaining({ observedAt: "2026-11-10T11:00:00Z" }),
            expect.objectContaining({ observedAt: "2026-11-10T12:00:00Z" }),
        ]);
    });

    it("throws when there is no temporal data", async () => {
        await expect(
            createMockNgsiAdapter().temporal!.history({ entityId: "nope", attrs: [], from: "", to: "" }),
        ).rejects.toBeInstanceOf(MockAdapterError);
    });
});

describe("live", () => {
    it("emits the query result at once and on every interval until unsubscribed", async () => {
        vi.useFakeTimers();
        const onChange = vi.fn();
        const stop = createMockNgsiAdapter(undefined, { liveIntervalMs: 1000 }).live!.watch(
            { types: [fixtureTypes.Camera] },
            onChange,
        );
        await vi.advanceTimersByTimeAsync(0);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toHaveLength(2);
        await vi.advanceTimersByTimeAsync(2000);
        expect(onChange).toHaveBeenCalledTimes(3);
        stop();
        await vi.advanceTimersByTimeAsync(5000);
        expect(onChange).toHaveBeenCalledTimes(3);
    });
});

describe("saved queries", () => {
    it("saves, updates and removes", async () => {
        const s = createMockNgsiAdapter().savedQueries!;
        const saved = await s.save({ name: "cams", query: { types: [fixtureTypes.Camera] } });
        expect(saved.id).toBeTruthy();
        await s.update({ ...saved, name: "cameras" });
        expect((await s.list()).find((q) => q.id === saved.id)?.name).toBe("cameras");
        await s.remove(saved.id);
        expect((await s.list()).map((q) => q.id)).not.toContain(saved.id);
    });
});

describe("fixtures", () => {
    it("gives each adapter its own copy", async () => {
        const fixtures = defaultMockFixtures();
        const a = createMockNgsiAdapter(fixtures);
        const b = createMockNgsiAdapter(fixtures);
        await a.subscriptions!.remove("urn:ngsi-ld:Subscription:crowd-high");
        expect(await b.subscriptions!.list()).toHaveLength(2);
        expect(fixtures.subscriptions).toHaveLength(2);
    });
});
