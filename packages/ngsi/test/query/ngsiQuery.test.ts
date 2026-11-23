import { describe, expect, it } from "vitest";
import { buildNgsiQuery, parseConditions, parseNgsiQuery, QueryParseError } from "../../src/query/ngsiQuery";

const SDM = "https://smartdatamodels.org/dataModel.Transportation/";
const crowd = { type: "CrowdFlowObserved", contextUri: SDM };
const centre = { label: "Centre", lat: 52.0705, lon: 4.3007, radiusKm: 1.5 };

describe("buildNgsiQuery", () => {
    it("writes nothing for an empty query", () => {
        expect(buildNgsiQuery({})).toBe("");
    });

    it("writes types with their context, comma separated", () => {
        expect(buildNgsiQuery({ types: [crowd, { type: "Camera" }] })).toBe(`type=${SDM}CrowdFlowObserved,Camera`);
    });

    it("joins complete conditions with ; and skips incomplete rows", () => {
        const conditions = [
            { property: "peopleCount", operator: ">", value: "10" },
            { property: "status", operator: "==", value: '"open"' },
            { property: "speed", operator: ">", value: "" },
            { property: "", operator: "<", value: "3" },
        ];
        expect(buildNgsiQuery({ conditions })).toBe('q=peopleCount>10;status=="open"');
    });

    it("puts a ready q before the conditions", () => {
        expect(buildNgsiQuery({ q: "a>1", conditions: [{ property: "b", operator: "<", value: "2" }] })).toBe(
            "q=a>1;b<2",
        );
    });

    it("writes a geo filter as near a point, in whole metres", () => {
        expect(buildNgsiQuery({ geo: { ...centre, radiusKm: 1.1 } })).toBe(
            "geometry=Point&coordinates=[4.3007,52.0705]&georel=near;maxDistance==1100",
        );
    });

    it("writes types, conditions, geo, limit and offset in that order", () => {
        expect(
            buildNgsiQuery({
                types: [crowd],
                conditions: [{ property: "peopleCount", operator: ">", value: "10" }],
                geo: centre,
                limit: 20,
                offset: 40,
            }),
        ).toBe(
            `type=${SDM}CrowdFlowObserved&q=peopleCount>10&geometry=Point&coordinates=[4.3007,52.0705]&georel=near;maxDistance==1500&limit=20&offset=40`,
        );
    });
});

describe("parseNgsiQuery", () => {
    it("reads back what buildNgsiQuery writes, keeping the known type refs", () => {
        const query = {
            types: [crowd],
            q: "peopleCount>10",
            geo: { lat: 52.0705, lon: 4.3007, radiusKm: 1.5 },
            limit: 20,
            offset: 40,
        };
        expect(parseNgsiQuery(buildNgsiQuery(query), [crowd])).toEqual(query);
    });

    it("keeps unknown types as plain names", () => {
        expect(parseNgsiQuery("type=A,B")).toEqual({ types: [{ type: "A" }, { type: "B" }] });
    });

    it("reads percent-encoded values and leaves a literal % alone", () => {
        expect(parseNgsiQuery("q=name%3D%3D%22x%22")).toEqual({ q: 'name=="x"' });
        expect(parseNgsiQuery("q=rate<50%")).toEqual({ q: "rate<50%" });
    });

    it("reads an empty string as an empty query", () => {
        expect(parseNgsiQuery("")).toEqual({});
    });

    it("refuses parameters it cannot express instead of dropping them", () => {
        expect(() => parseNgsiQuery("type=A&attrs=x")).toThrow("Not supported in the query: attrs");
        expect(() => parseNgsiQuery("type=A&attrs=x")).toThrow(QueryParseError);
        expect(() => parseNgsiQuery("georel=within&coordinates=[1,2]")).toThrow("georel");
        expect(() => parseNgsiQuery("geometry=Polygon&coordinates=[1,2]&georel=near;maxDistance==5")).toThrow("georel");
        expect(() => parseNgsiQuery("limit=-1")).toThrow("limit");
    });
});

describe("parseConditions", () => {
    it("splits a q string into rows and skips parts that are not a comparison", () => {
        expect(parseConditions('peopleCount>=10;status=="open";(a|b)')).toEqual([
            { property: "peopleCount", operator: ">=", value: "10" },
            { property: "status", operator: "==", value: '"open"' },
        ]);
    });
});
