import { newQueryCondition, type QueryBuilderDraft } from "@vela-tools/ui";
import { describe, expect, it } from "vitest";
import { fixtureSavedQueries, fixtureTypes } from "../../../src/testing/fixtures";
import type { EntityTypeInfo } from "../../../src/types";
import {
    clearConditions,
    conditionProperties,
    draftToQuery,
    emptyDraft,
    followActiveQuery,
    previewOf,
    queryToDraft,
    toBuilderTypes,
    toSavedItem,
    typeKey,
} from "../../../src/bound/queryBuilder/draft";

const { Camera, OSMPlace } = fixtureTypes;
const geo = { label: "Centre", lat: 52.0705, lon: 4.3007, radiusKm: 2 };

const draft = (overrides: Partial<QueryBuilderDraft> = {}): QueryBuilderDraft => ({ ...emptyDraft(), ...overrides });

describe("typeKey", () => {
    it("turns keys back into the same type refs, with and without a contextUri", () => {
        const result = draftToQuery(draft({ typeKeys: [typeKey(Camera), typeKey({ type: "Camera" })] }));
        expect(result).toEqual({ ok: true, query: { types: [Camera, { type: "Camera" }] } });
    });

    it("keeps refs with the same name in different contexts apart", () => {
        expect(typeKey(Camera)).not.toBe(typeKey({ type: "Camera", contextUri: "https://other.example/" }));
    });
});

describe("toBuilderTypes", () => {
    it("offers only Property attributes, keeps counts and gives each type a colour", () => {
        const infos: EntityTypeInfo[] = [
            {
                type: Camera,
                count: 2,
                attributes: [
                    { name: "status", kind: "Property" },
                    { name: "location", kind: "GeoProperty" },
                    { name: "hasDevice", kind: "Relationship" },
                ],
            },
            { type: OSMPlace, attributes: [{ name: "name", kind: "Property" }] },
        ];
        const [camera, place] = toBuilderTypes(infos);
        expect(camera).toMatchObject({ key: typeKey(Camera), label: "Camera", count: 2, properties: ["status"] });
        expect(camera.color).toMatch(/^#/);
        expect(place).toMatchObject({ label: "OSMPlace", count: undefined, properties: ["name"] });
    });
});

describe("draftToQuery", () => {
    it("builds types, the complete rows and the geo region from builder mode", () => {
        const result = draftToQuery(
            draft({
                typeKeys: [typeKey(Camera)],
                conditions: [
                    newQueryCondition({ property: "status", operator: "==", value: '"faulty"' }),
                    newQueryCondition({ property: "name", operator: "==", value: "" }),
                    newQueryCondition({ property: "height", operator: ">", value: "3" }),
                ],
                geo,
            }),
        );
        expect(result).toEqual({ ok: true, query: { types: [Camera], q: 'status=="faulty";height>3', geo } });
    });

    it("gives an empty query for an empty draft", () => {
        expect(draftToQuery(emptyDraft())).toEqual({ ok: true, query: {} });
    });

    it("parses text mode, matching types to the known ones", () => {
        const result = draftToQuery(draft({ mode: "text", text: ` type=${Camera.contextUri}Camera&q=status=="ok" ` }), [
            Camera,
        ]);
        expect(result).toEqual({ ok: true, query: { types: [Camera], q: 'status=="ok"' } });
    });

    it("returns the parse error for text it cannot express", () => {
        expect(draftToQuery(draft({ mode: "text", text: "type=Camera&attrs=name" }))).toEqual({
            ok: false,
            error: "Not supported in the query: attrs",
        });
    });
});

describe("previewOf", () => {
    it("shows the built query in builder mode, with the radius in metres", () => {
        const preview = previewOf(
            draft({
                typeKeys: [typeKey({ type: "Camera" })],
                conditions: [newQueryCondition({ property: "status", operator: "==", value: '"ok"' })],
                geo: { lat: 52, lon: 4, radiusKm: 1.5 },
            }),
        );
        expect(preview).toBe(
            'type=Camera&q=status=="ok"&geometry=Point&coordinates=[4,52]&georel=near;maxDistance==1500',
        );
    });

    it("shows the text as typed in text mode", () => {
        expect(previewOf(draft({ mode: "text", text: "q=a>1" }))).toBe("q=a>1");
    });
});

describe("queryToDraft", () => {
    it("opens a query the rows can hold in builder mode, and back to the same query", () => {
        const query = { types: [Camera], q: 'status=="faulty";height>3', geo };
        const d = queryToDraft(query);
        expect(d.mode).toBe("builder");
        expect(d.conditions.map(({ property, operator, value }) => ({ property, operator, value }))).toEqual([
            { property: "status", operator: "==", value: '"faulty"' },
            { property: "height", operator: ">", value: "3" },
        ]);
        expect(draftToQuery(d)).toEqual({ ok: true, query });
    });

    it("round-trips the saved query fixture", () => {
        const { query } = fixtureSavedQueries[0];
        expect(draftToQuery(queryToDraft(query))).toEqual({ ok: true, query });
    });

    it("gives an empty query one empty row", () => {
        const d = queryToDraft({});
        expect(d).toMatchObject({ typeKeys: [], mode: "builder", text: "", geo: null });
        expect(d.conditions).toHaveLength(1);
    });

    it("opens an OR query in text mode so nothing is lost", () => {
        const query = { types: [Camera], q: 'status=="ok"|status=="faulty"' };
        const d = queryToDraft(query);
        expect(d.mode).toBe("text");
        expect(draftToQuery(d, [Camera])).toEqual({ ok: true, query });
    });

    it("opens a query with limit or offset in text mode", () => {
        const d = queryToDraft({ q: "a>1", limit: 10 });
        expect(d.mode).toBe("text");
        expect(draftToQuery(d)).toEqual({ ok: true, query: { q: "a>1", limit: 10 } });
    });
});

describe("followActiveQuery", () => {
    const rows = [newQueryCondition({ property: "status", operator: "==", value: '"ok"' })];

    it("takes over the types and geo region and keeps the rows in builder mode", () => {
        const next = followActiveQuery(draft({ conditions: rows }), { types: [OSMPlace], geo });
        expect(next).toMatchObject({ typeKeys: [typeKey(OSMPlace)], geo, conditions: rows });
    });

    it("clears the geo region when the active query has none", () => {
        expect(followActiveQuery(draft({ geo }), {}).geo).toBeNull();
    });

    it("leaves a text mode draft alone", () => {
        const d = draft({ mode: "text", text: "q=a>1" });
        expect(followActiveQuery(d, { types: [OSMPlace] })).toBe(d);
    });
});

describe("toSavedItem", () => {
    it("describes the types, q and region", () => {
        expect(toSavedItem(fixtureSavedQueries[0])).toEqual({
            id: "saved-1",
            name: "Busy crowd sensors near the centre",
            createdAt: "2026-11-01T09:00:00Z",
            description: "CrowdFlowObserved · occupancy>0.5 · Centre 2 km",
        });
    });

    it('says "(all types)" without types', () => {
        expect(toSavedItem({ id: "x", name: "All", createdAt: "", query: {} }).description).toBe("(all types)");
    });
});

describe("conditionProperties", () => {
    const draft = (overrides: Partial<QueryBuilderDraft>): QueryBuilderDraft => ({
        typeKeys: [],
        mode: "builder",
        conditions: [],
        text: "",
        geo: null,
        ...overrides,
    });

    it("lists each property of a complete builder condition once", () => {
        const conditions = [
            newQueryCondition({ property: "status", operator: "==", value: '"on"' }),
            newQueryCondition({ property: "temperature", operator: ">", value: "25" }),
            newQueryCondition({ property: "status", operator: "!=", value: '"off"' }),
            newQueryCondition({ property: "humidity", operator: ">", value: "" }),
        ];
        expect(conditionProperties(draft({ conditions }))).toEqual(["status", "temperature"]);
    });

    it("is empty in text mode", () => {
        expect(
            conditionProperties(
                draft({ mode: "text", conditions: [newQueryCondition({ property: "a", operator: ">", value: "1" })] }),
            ),
        ).toEqual([]);
    });
});

describe("clearConditions", () => {
    it("leaves one empty condition and keeps types, geo and text", () => {
        const geo = { lat: 1, lon: 2, radiusKm: 3 };
        const before: QueryBuilderDraft = {
            typeKeys: ["Camera"],
            mode: "builder",
            conditions: [newQueryCondition({ property: "a", operator: ">", value: "1" })],
            text: "type=Camera",
            geo,
        };
        const after = clearConditions(before);
        expect(after).toMatchObject({ typeKeys: ["Camera"], text: "type=Camera", geo });
        expect(after.conditions).toHaveLength(1);
        expect(after.conditions[0]).toMatchObject({ property: "", value: "" });
    });
});
