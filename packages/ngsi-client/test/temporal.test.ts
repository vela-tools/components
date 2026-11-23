import { describe, expect, it } from "vitest";
import { BASE, mockFetch, type Fixture } from "./fixtures/mockFetch";
import { createHttp } from "../src/http";
import { createTemporalSource } from "../src/temporal";
import type { NgsiLdClientConfig } from "../src/config";

const ID = "urn:ngsi-ld:CrowdFlowObserved:flow-1";
const series: Fixture = {
    status: 200,
    headers: {},
    body: {
        id: ID,
        type: "CrowdFlowObserved",
        peopleCount: [
            { type: "Property", value: 3, observedAt: "2026-11-12T12:00:00Z" },
            { type: "Property", value: 5, observedAt: "2026-11-12T13:00:00Z" },
        ],
    },
};

function source(routes: Parameters<typeof mockFetch>[0], config: Partial<NgsiLdClientConfig> = {}) {
    const fetch = mockFetch(routes);
    const cfg = { url: BASE, fetch, ...config };
    return { t: createTemporalSource(createHttp(cfg), cfg), fetch };
}

describe("temporal.history", () => {
    const query = {
        entityId: ID,
        attrs: ["peopleCount"],
        from: "2026-11-12T00:00:00Z",
        to: "2026-11-13T00:00:00Z",
        lastN: 2,
    };

    it("asks for the attributes between from and to, and returns the temporal representation", async () => {
        const { t, fetch } = source(
            { [`GET /temporal/entities/${ID}`]: series },
            { context: "https://ctx.example/c.jsonld" },
        );
        const entity = await t.history(query);
        const p = new URL(String(fetch.mock.calls[0][0])).searchParams;
        expect(Object.fromEntries(p)).toEqual({
            attrs: "peopleCount",
            timerel: "between",
            timeAt: query.from,
            endTimeAt: query.to,
            lastN: "2",
        });
        expect(entity).toMatchObject({
            id: ID,
            "@context": "https://ctx.example/c.jsonld",
            peopleCount: [{ value: 3 }, { value: 5 }],
        });
    });

    it("leaves out attrs when none are asked for", async () => {
        const { t, fetch } = source({ [`GET /temporal/entities/${ID}`]: series });
        await t.history({ ...query, attrs: [], lastN: undefined });
        const p = new URL(String(fetch.mock.calls[0][0])).searchParams;
        expect([p.has("attrs"), p.has("lastN")]).toEqual([false, false]);
    });

    it("retries an id with slashes encoded twice after a 405, like getEntity", async () => {
        const iri = "https://example.org/sensor/1";
        const fetch = mockFetch({});
        fetch.mockImplementation(async (input) => {
            const url = String(input);
            const twice = url.includes(encodeURIComponent(encodeURIComponent(iri)));
            return new Response(twice ? JSON.stringify({ id: iri, type: "Sensor" }) : "", {
                status: twice ? 200 : 405,
            });
        });
        const cfg = { url: BASE, fetch };
        expect(await createTemporalSource(createHttp(cfg), cfg).history({ ...query, entityId: iri })).toMatchObject({
            id: iri,
        });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("throws the broker error, e.g. a broker without the temporal API", async () => {
        const { t } = source({
            [`GET /temporal/entities/${ID}`]: {
                status: 501,
                headers: {},
                body: { type: "https://uri.etsi.org/ngsi-ld/errors/OperationNotSupported" },
            },
        });
        await expect(t.history(query)).rejects.toMatchObject({ status: 501 });
    });

    it("throws on a malformed answer", async () => {
        const { t } = source({ [`GET /temporal/entities/${ID}`]: { status: 200, headers: {}, body: { type: "X" } } });
        await expect(t.history(query)).rejects.toThrow("can't be read");
    });
});
