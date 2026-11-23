import { describe, expect, it, vi } from "vitest";
import crowd from "./fixtures/entities-crowd-flow.json";
import sensors from "./fixtures/entities-virtual-camera-sensor.json";
import byId from "./fixtures/entity-by-id.json";
import badQ from "./fixtures/error-bad-q.json";
import notFound from "./fixtures/error-entity-not-found.json";
import { BASE, mockFetch, type Fixture } from "./fixtures/mockFetch";
import typeInfo from "./fixtures/type-info-virtual-camera-sensor.json";
import types from "./fixtures/types.json";
import { NgsiValidationError, createEntitySource } from "../src/entities";
import { createHttp, NgsiClientError } from "../src/http";
import type { NgsiLdClientConfig } from "../src/config";

const SENSOR = "https://example.org/vela/VirtualCameraSensor";
const CROWD = "https://smartdatamodels.org/dataModel.Transportation/CrowdFlowObserved";

function source(routes: Parameters<typeof mockFetch>[0], config: Partial<NgsiLdClientConfig> = {}) {
    const fetch = mockFetch(routes);
    const cfg = { url: BASE, fetch, ...config };
    return { src: createEntitySource(createHttp(cfg), cfg), fetch };
}
const lastUrl = (fetch: ReturnType<typeof mockFetch>) => new URL(String(fetch.mock.calls.at(-1)![0]));

describe("listTypes", () => {
    it("lists every type from /types with kinds and counts from /types/{type}", async () => {
        const { src } = source({ "GET /types": types, [`GET /types/${SENSOR}`]: typeInfo });
        const list = await src.listTypes();
        expect(list).toHaveLength(types.body.typeList.length);
        const sensor = list.find((t) => t.type.type === "VirtualCameraSensor")!;
        expect(sensor.type).toEqual({ type: "VirtualCameraSensor", contextUri: "https://example.org/vela/" });
        expect(sensor.count).toBe(12);
        expect(sensor.attributes).toEqual([
            { name: "https://smartdatamodels.org/name", kind: "Property" },
            { name: "https://example.org/vela/hasDevice", kind: "Relationship" },
            { name: "https://example.org/vela/separatorLine", kind: "GeoProperty" },
            { name: "https://example.org/vela/legacy", kind: "Property" },
        ]);
    });

    it("still lists a type whose details request fails, without attributes", async () => {
        const { src } = source({ "GET /types": types });
        const camera = (await src.listTypes()).find((t) => t.type.type === "Camera")!;
        expect(camera).toEqual({
            type: { type: "Camera", contextUri: "https://smartdatamodels.org/dataModel.Device/" },
            attributes: [],
        });
    });

    it("still lists a type whose details request fails at the network level", async () => {
        const routes = mockFetch({ "GET /types": types, [`GET /types/${SENSOR}`]: typeInfo });
        const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
            String(input).includes(encodeURIComponent("dataModel.Device/Camera"))
                ? Promise.reject(new TypeError("NetworkError when attempting to fetch resource."))
                : routes(input, init),
        );
        const cfg = { url: BASE, fetch };
        const list = await createEntitySource(createHttp(cfg), cfg).listTypes();
        expect(list).toHaveLength(types.body.typeList.length);
        expect(list.find((t) => t.type.type === "Camera")!.attributes).toEqual([]);
        expect(list.find((t) => t.type.type === "VirtualCameraSensor")!.count).toBe(12);
    });

    it("reports a type whose details request fails, but not one the broker no longer has", async () => {
        const routes = mockFetch({ "GET /types": types, [`GET /types/${SENSOR}`]: typeInfo });
        const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
            String(input).includes(encodeURIComponent("dataModel.Device/Camera"))
                ? Promise.reject(new TypeError("Failed to fetch"))
                : routes(input, init),
        );
        const onInvalid = vi.fn();
        const cfg = { url: BASE, fetch, onInvalid };
        await createEntitySource(createHttp(cfg), cfg).listTypes();
        expect(onInvalid).toHaveBeenCalledTimes(1);
        expect(onInvalid).toHaveBeenCalledWith(
            expect.objectContaining({ kind: "type", value: expect.stringContaining("Camera") }),
        );
    });

    it("rethrows an abort instead of listing types without details", async () => {
        const routes = mockFetch({ "GET /types": types });
        const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
        const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
            String(input).includes("/types/") ? Promise.reject(abort) : routes(input, init),
        );
        const cfg = { url: BASE, fetch };
        await expect(createEntitySource(createHttp(cfg), cfg).listTypes()).rejects.toMatchObject({
            name: "AbortError",
        });
    });

    it("takes every type and its attributes from one /types?details=true request when the broker supports it", async () => {
        const details = [
            {
                id: SENSOR,
                type: "EntityType",
                typeName: SENSOR,
                attributeNames: ["https://smartdatamodels.org/name", "location"],
            },
            {
                id: "ngsi-ld:default-context/Thermostat",
                type: "EntityType",
                typeName: "Thermostat",
                attributeNames: [],
            },
        ];
        const { src, fetch } = source({
            "GET /types": { status: 200, headers: { "content-type": "application/json" }, body: details },
        });
        const list = await src.listTypes();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(lastUrl(fetch).searchParams.get("details")).toBe("true");
        expect(list).toEqual([
            {
                type: { type: "VirtualCameraSensor", contextUri: "https://example.org/vela/" },
                attributes: [
                    { name: "https://smartdatamodels.org/name", kind: "Property" },
                    { name: "location", kind: "GeoProperty" },
                ],
            },
            { type: { type: "Thermostat" }, attributes: [] },
        ]);
    });

    it("reads a single attribute name compacted to a string without falling back to /types/{type}", async () => {
        const details = [
            {
                id: "ngsi-ld:default-context/AquilaTest",
                type: "EntityType",
                typeName: "AquilaTest",
                attributeNames: "pH",
            },
            {
                id: "ngsi-ld:default-context/Bus",
                type: "EntityType",
                typeName: "Bus",
                attributeNames: ["location", "lineNumber"],
            },
        ];
        const { src, fetch } = source({
            "GET /types": { status: 200, headers: { "content-type": "application/json" }, body: details },
        });
        const list = await src.listTypes();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(list).toEqual([
            { type: { type: "AquilaTest" }, attributes: [{ name: "pH", kind: "Property" }] },
            {
                type: { type: "Bus" },
                attributes: [
                    { name: "location", kind: "GeoProperty" },
                    { name: "lineNumber", kind: "Property" },
                ],
            },
        ]);
    });

    it("reads a single attribute detail and attribute type compacted to plain values from /types/{type}", async () => {
        const info = {
            status: 200,
            headers: { "content-type": "application/json" },
            body: {
                id: SENSOR,
                type: "EntityTypeInfo",
                typeName: SENSOR,
                entityCount: 2,
                attributeDetails: { id: "pH", type: "Attribute", attributeName: "pH", attributeTypes: "Property" },
            },
        };
        const { src } = source({
            "GET /types": {
                status: 200,
                headers: { "content-type": "application/json" },
                body: { typeList: [SENSOR] },
            },
            [`GET /types/${SENSOR}`]: info,
        });
        const list = await src.listTypes();
        expect(list).toEqual([
            {
                type: { type: "VirtualCameraSensor", contextUri: "https://example.org/vela/" },
                attributes: [{ name: "pH", kind: "Property" }],
                count: 2,
            },
        ]);
    });

    it("asks for at most four type details at a time when the broker only lists names", async () => {
        const routes = mockFetch({ "GET /types": types, [`GET /types/${SENSOR}`]: typeInfo });
        let inFlight = 0;
        let peak = 0;
        const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, 1));
            try {
                return await routes(input, init);
            } finally {
                inFlight--;
            }
        });
        const cfg = { url: BASE, fetch };
        const list = await createEntitySource(createHttp(cfg), cfg).listTypes();
        expect(list).toHaveLength(types.body.typeList.length);
        expect(types.body.typeList.length).toBeGreaterThan(4);
        expect(peak).toBe(4);
    });

    it("throws when /types itself fails", async () => {
        const { src } = source({
            "GET /types": { status: 502, headers: {}, body: "Failed to connect to upstream server" },
        });
        await expect(src.listTypes()).rejects.toMatchObject({ name: "NgsiClientError", status: 502 });
    });
});

describe("queryEntities", () => {
    it("sends full type IRIs, q, geo, paging and count, and reads the total", async () => {
        const reply: Fixture = { ...crowd, headers: { ...crowd.headers, "NGSILD-Results-Count": "41" } };
        const { src, fetch } = source({ "GET /entities": reply });
        const res = await src.queryEntities({
            types: [
                { type: "CrowdFlowObserved", contextUri: "https://smartdatamodels.org/dataModel.Transportation/" },
                { type: "VirtualCameraSensor", contextUri: "https://example.org/vela/" },
            ],
            q: "peopleCount>10",
            geo: { lat: 50.01, lon: 10.03, radiusKm: 1.5 },
            limit: 2,
            offset: 4,
        });
        const p = lastUrl(fetch).searchParams;
        expect(p.get("type")).toBe(`${CROWD},${SENSOR}`);
        expect(p.get("q")).toBe("peopleCount>10");
        expect(p.get("georel")).toBe("near;maxDistance==1500");
        expect(p.get("geometry")).toBe("Point");
        expect(p.get("coordinates")).toBe("[10.03,50.01]");
        expect([p.get("limit"), p.get("offset"), p.get("count")]).toEqual(["2", "4", "true"]);
        expect(res.total).toBe(41);
        expect(res.entities.map((e) => e.id)).toEqual(crowd.body.map((e) => e.id));
    });

    it("fills @context from the Link header, or from the configured context", async () => {
        const { src } = source({ "GET /entities": sensors });
        expect((await src.queryEntities({ types: [{ type: SENSOR }] })).entities[0]["@context"]).toBe(
            "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld",
        );
        const withCtx = source({ "GET /entities": sensors }, { context: "https://ctx.example/vela.jsonld" });
        expect((await withCtx.src.queryEntities({ types: [{ type: SENSOR }] })).entities[0]["@context"]).toBe(
            "https://ctx.example/vela.jsonld",
        );
    });

    it("drops malformed entities, reports them, and keeps the rest", async () => {
        const onInvalid = vi.fn();
        const broken = {
            id: "urn:ngsi-ld:CrowdFlowObserved:broken",
            type: CROWD,
            loc: { type: "GeoProperty", value: { type: "Point" } },
        };
        const { src } = source({ "GET /entities": { ...crowd, body: [...crowd.body, broken] } }, { onInvalid });
        const res = await src.queryEntities({ types: [{ type: CROWD }] });
        expect(res.entities).toHaveLength(crowd.body.length);
        expect(onInvalid).toHaveBeenCalledWith(
            expect.objectContaining({ kind: "entity", value: broken, reason: expect.stringContaining("loc") }),
        );
    });

    it("queries every known type when the query has no type, q or geo", async () => {
        const { src, fetch } = source({ "GET /types": types, "GET /entities": sensors });
        await src.queryEntities({});
        expect(lastUrl(fetch).searchParams.get("type")).toBe(types.body.typeList.join(","));
    });

    it("leaves total undefined when the broker sends no count", async () => {
        const { src } = source({ "GET /entities": sensors });
        expect((await src.queryEntities({ types: [{ type: SENSOR }] })).total).toBeUndefined();
    });

    it("throws the broker error instead of returning []", async () => {
        const { src } = source({ "GET /entities": badQ });
        const err = await src.queryEntities({ types: [{ type: "x" }], q: "(((" }).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(NgsiClientError);
        expect(err).toMatchObject({ status: 500, problemType: "https://uri.etsi.org/ngsi-ld/errors/InternalError" });
    });
});

describe("getEntity", () => {
    it("returns the entity", async () => {
        const { src, fetch } = source({ [`GET /entities/${byId.body.id}`]: byId });
        const e = await src.getEntity(byId.body.id);
        expect(e?.id).toBe(byId.body.id);
        expect(lastUrl(fetch).pathname).toBe(`/ngsi-ld/v1/entities/${encodeURIComponent(byId.body.id)}`);
    });

    it("returns null for 404", async () => {
        const { src } = source({ "GET /entities/urn:ngsi-ld:Vela:does-not-exist": notFound });
        expect(await src.getEntity("urn:ngsi-ld:Vela:does-not-exist")).toBeNull();
    });

    it("throws for other errors and for a malformed entity", async () => {
        const down = source({
            "GET /entities/urn:x": { status: 503, headers: {}, body: { title: "Service Unavailable" } },
        });
        await expect(down.src.getEntity("urn:x")).rejects.toMatchObject({ status: 503 });
        const bad = source({ "GET /entities/urn:x": { status: 200, headers: {}, body: { id: "urn:x" } } });
        await expect(bad.src.getEntity("urn:x")).rejects.toBeInstanceOf(NgsiValidationError);
    });

    it("passes the abort signal to fetch", async () => {
        const ac = new AbortController();
        const { src, fetch } = source({ [`GET /entities/${byId.body.id}`]: byId });
        await src.getEntity(byId.body.id, { signal: ac.signal });
        expect(fetch.mock.calls[0][1]!.signal).toBe(ac.signal);
    });
});

describe("gateways that decode the path once more", () => {
    function gatewayFetch() {
        return vi.fn<typeof fetch>(async (input) => {
            const url = new URL(String(input));
            const path = url.pathname.replace(/^\/ngsi-ld\/v1/, "");
            const json = (status: number, body: unknown) =>
                new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
            if (path === "/types") return json(200, types.body);
            if (path.startsWith("/types/")) {
                const raw = path.slice("/types/".length);
                if (raw.includes("%252F")) {
                    const name = decodeURIComponent(decodeURIComponent(raw));
                    return json(200, { ...typeInfo.body, id: name, typeName: name });
                }
                if (raw.includes("%2F"))
                    return json(405, {
                        type: "https://uri.etsi.org/ngsi-ld/errors/MethodNotAllowed",
                        title: "Method not supported on this endpoint.",
                        status: 405,
                    });
            }
            return json(404, notFound.body);
        });
    }
    const typePaths = (fetch: ReturnType<typeof gatewayFetch>) =>
        fetch.mock.calls.map((c) => new URL(String(c[0])).pathname).filter((p) => p.includes("/types/"));

    it("retries a 405 with the type encoded twice, then keeps encoding twice", async () => {
        const fetch = gatewayFetch();
        const cfg = { url: BASE, fetch };
        const src = createEntitySource(createHttp(cfg), cfg);
        const list = await src.listTypes();
        expect(list).toHaveLength(types.body.typeList.length);
        for (const t of list)
            expect(t).toMatchObject({
                count: 12,
                attributes: expect.arrayContaining([expect.objectContaining({ kind: "Property" })]),
            });
        fetch.mockClear();
        await src.listTypes();
        expect(typePaths(fetch).every((p) => p.includes("%252F"))).toBe(true);
    });

    it("does not retry when the broker handles single encoding", async () => {
        const { src, fetch } = source({ "GET /types": types, [`GET /types/${SENSOR}`]: typeInfo });
        await src.listTypes();
        const paths = fetch.mock.calls.map((c) => new URL(String(c[0])).pathname).filter((p) => p.includes("/types/"));
        expect(paths.some((p) => p.includes("%252F"))).toBe(false);
    });

    it("does not retry a 405 on a segment without slashes", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(
            async () => new Response(JSON.stringify({ status: 405 }), { status: 405 }),
        );
        const cfg = { url: BASE, fetch };
        const src = createEntitySource(createHttp(cfg), cfg);
        await expect(src.getEntity("urn:ngsi-ld:Camera:camera-1")).rejects.toMatchObject({ status: 405 });
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
