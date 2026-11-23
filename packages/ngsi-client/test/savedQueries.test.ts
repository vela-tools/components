import { describe, expect, it, vi } from "vitest";
import { BASE, mockFetch, type Fixture } from "./fixtures/mockFetch";
import { createHttp } from "../src/http";
import { createSavedQueryStore } from "../src/savedQueries";
import type { NgsiLdClientConfig } from "../src/config";

function store(routes: Parameters<typeof mockFetch>[0], config: Partial<NgsiLdClientConfig> = {}) {
    const fetch = mockFetch(routes);
    const cfg = { url: BASE, fetch, ...config };
    return { s: createSavedQueryStore(createHttp(cfg), cfg), fetch };
}
const ok = (body: unknown = null): Fixture => ({ status: body === null ? 204 : 200, headers: {}, body });
const sent = (fetch: ReturnType<typeof mockFetch>) => {
    const [url, init] = fetch.mock.calls.at(-1)!;
    return {
        url: new URL(String(url)),
        method: init!.method,
        body: init!.body ? JSON.parse(String(init!.body)) : undefined,
    };
};

const query = {
    types: [{ type: "CrowdFlowObserved", contextUri: "https://smartdatamodels.org/dataModel.Transportation/" }],
    q: "peopleCount>10",
    geo: { label: "Centre", lat: 50.01, lon: 10.01, radiusKm: 1.5 },
};

describe("savedQueries.list", () => {
    it("reads the stored query, oldest first, with the broker createdAt", async () => {
        const { s, fetch } = store({
            "GET /entities": ok([
                {
                    id: "urn:b",
                    type: "SavedQuery",
                    name: { type: "Property", value: "Busy" },
                    entityQuery: { type: "Property", value: JSON.stringify(query) },
                    createdAt: "2026-11-02T00:00:00Z",
                },
                {
                    id: "urn:a",
                    type: "SavedQuery",
                    name: { type: "Property", value: "All" },
                    entityQuery: { type: "Property", value: "{}" },
                    createdAt: "2026-11-01T00:00:00Z",
                },
            ]),
        });
        expect(await s.list()).toEqual([
            { id: "urn:a", name: "All", query: {}, createdAt: "2026-11-01T00:00:00Z" },
            { id: "urn:b", name: "Busy", query, createdAt: "2026-11-02T00:00:00Z" },
        ]);
        const p = sent(fetch).url.searchParams;
        expect([p.get("type"), p.get("options"), p.get("limit")]).toEqual(["SavedQuery", "sysAttrs", "50"]);
    });

    it("still reads Telescopium's format", async () => {
        const { s } = store(
            {
                "GET /entities": ok([
                    {
                        id: "urn:t",
                        type: "TelescopiumQuery",
                        name: { type: "Property", value: "Old" },
                        query: {
                            type: "Property",
                            value: `type=https://smartdatamodels.org/dataModel.Transportation/CrowdFlowObserved&q=peopleCount>10&geometry=Point&coordinates=[10.01,50.01]&georel=near;maxDistance==1500`,
                        },
                        entityTypes: { type: "Property", value: JSON.stringify(query.types) },
                        geoFilter: { type: "Property", value: JSON.stringify(query.geo) },
                        createdAt: { type: "Property", value: "2026-10-01T00:00:00Z" },
                    },
                ]),
            },
            { savedQueryEntityType: "TelescopiumQuery" },
        );
        expect(await s.list()).toEqual([{ id: "urn:t", name: "Old", query, createdAt: "2026-10-01T00:00:00Z" }]);
    });

    it("drops malformed entities and stored JSON it cannot read", async () => {
        const onInvalid = vi.fn();
        const { s } = store(
            {
                "GET /entities": ok([
                    { id: "", type: "SavedQuery" },
                    { id: "urn:x", type: "SavedQuery", entityQuery: { type: "Property", value: "{not json" } },
                ]),
            },
            { onInvalid },
        );
        expect(await s.list()).toEqual([{ id: "urn:x", name: "", query: {}, createdAt: "" }]);
        expect(onInvalid).toHaveBeenCalledWith(expect.objectContaining({ kind: "savedQuery" }));
    });

    it("reads every page", async () => {
        const entity = (i: number) => ({ id: `urn:${i}`, type: "SavedQuery" });
        const { s } = store({
            "GET /entities": (url) =>
                ok(
                    Number(url.searchParams.get("offset")) === 0
                        ? Array.from({ length: 50 }, (_, i) => entity(i))
                        : [entity(50)],
                ),
        });
        expect(await s.list()).toHaveLength(51);
    });
});

describe("savedQueries.save, update and remove", () => {
    it("POSTs an entity of the configured type with the query as JSON text", async () => {
        const { s, fetch } = store(
            { "POST /entities": { status: 201, headers: {}, body: null } },
            { savedQueryEntityType: "TelescopiumQuery" },
        );
        const saved = await s.save({ name: "Busy", query });
        const req = sent(fetch);
        expect(req.body).toEqual({
            id: saved.id,
            type: "TelescopiumQuery",
            name: { type: "Property", value: "Busy" },
            entityQuery: { type: "Property", value: JSON.stringify(query) },
        });
        expect(saved).toMatchObject({ name: "Busy", query });
        expect(saved.id).toMatch(/^urn:ngsi-ld:TelescopiumQuery:/);
        expect(saved.createdAt).not.toBe("");
    });

    it("updates name and query only", async () => {
        const { s, fetch } = store({ "POST /entities/urn:ngsi-ld:SavedQuery:1/attrs": ok() });
        const q = {
            id: "urn:ngsi-ld:SavedQuery:1",
            name: "Renamed",
            query: { q: "a>1" },
            createdAt: "2026-11-01T00:00:00Z",
        };
        expect(await s.update(q)).toEqual(q);
        expect(sent(fetch).body).toEqual({
            name: { type: "Property", value: "Renamed" },
            entityQuery: { type: "Property", value: '{"q":"a>1"}' },
        });
    });

    it("DELETEs, and throws when it is gone", async () => {
        const { s } = store({
            "DELETE /entities/urn:1": ok(),
            "DELETE /entities/urn:gone": {
                status: 404,
                headers: {},
                body: { type: "https://uri.etsi.org/ngsi-ld/errors/ResourceNotFound" },
            },
        });
        await expect(s.remove("urn:1")).resolves.toBeUndefined();
        await expect(s.remove("urn:gone")).rejects.toMatchObject({ status: 404 });
    });
});
