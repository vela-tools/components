import { describe, expect, it } from "vitest";
import type { QueryBuilderType } from "../../../src/primitives/QueryBuilder/QueryBuilder.types";
import {
    allTypesSelected,
    filterTypes,
    geoFromInputs,
    geoLabel,
    newQueryCondition,
    removeCondition,
    sameGeo,
    selectedProperties,
    toggleTypeKey,
    totalCount,
    updateCondition,
} from "../../../src/primitives/QueryBuilder/queryBuilder.utils";

const types: QueryBuilderType[] = [
    { key: "a|Camera", label: "Camera", count: 3, properties: ["status", "location"] },
    { key: "b|CrowdFlowObserved", label: "CrowdFlowObserved", count: 10, properties: ["peopleCount", "status"] },
    { key: "c|OSMPlace", label: "OSMPlace", properties: ["name"] },
];

describe("newQueryCondition", () => {
    it("makes an empty row with the default operator and a fresh id", () => {
        const a = newQueryCondition();
        const b = newQueryCondition();
        expect(a).toMatchObject({ property: "", operator: ">", value: "" });
        expect(a.id).not.toBe(b.id);
    });

    it("takes initial values but always makes its own id", () => {
        const c = newQueryCondition({ property: "status", operator: "==", value: '"on"' });
        expect(c).toMatchObject({ property: "status", operator: "==", value: '"on"' });
        expect(c.id).toMatch(/^qbc-/);
    });
});

describe("filterTypes", () => {
    it("matches labels that start with the search, ignoring case and spaces", () => {
        expect(filterTypes(types, " c ").map((t) => t.label)).toEqual(["Camera", "CrowdFlowObserved"]);
        expect(filterTypes(types, "OSM").map((t) => t.label)).toEqual(["OSMPlace"]);
    });

    it("returns every type for an empty search", () => {
        expect(filterTypes(types, "")).toBe(types);
    });
});

describe("allTypesSelected", () => {
    it("is true only when every type is selected", () => {
        expect(allTypesSelected(types, ["a|Camera", "b|CrowdFlowObserved"])).toBe(false);
        expect(allTypesSelected(types, ["c|OSMPlace", "a|Camera", "b|CrowdFlowObserved"])).toBe(true);
    });

    it("is false without types", () => {
        expect(allTypesSelected([], [])).toBe(false);
    });
});

describe("toggleTypeKey", () => {
    it("adds a missing key and removes a present one", () => {
        expect(toggleTypeKey(["a|Camera"], "c|OSMPlace")).toEqual(["a|Camera", "c|OSMPlace"]);
        expect(toggleTypeKey(["a|Camera", "c|OSMPlace"], "a|Camera")).toEqual(["c|OSMPlace"]);
    });
});

describe("totalCount", () => {
    it("sums the known counts", () => {
        expect(totalCount(types)).toBe(13);
    });

    it("is undefined when no type has a count", () => {
        expect(totalCount([types[2]])).toBeUndefined();
    });
});

describe("selectedProperties", () => {
    it("lists the properties of the selected types once each", () => {
        expect(selectedProperties(types, ["a|Camera", "b|CrowdFlowObserved"])).toEqual([
            "status",
            "location",
            "peopleCount",
        ]);
    });

    it("is empty without a selection", () => {
        expect(selectedProperties(types, [])).toEqual([]);
    });
});

describe("condition rows", () => {
    const rows = [newQueryCondition({ property: "status" }), newQueryCondition({ property: "name" })];

    it("updates one field of one row", () => {
        const next = updateCondition(rows, rows[1].id, "value", '"pier"');
        expect(next[1]).toEqual({ ...rows[1], value: '"pier"' });
        expect(next[0]).toBe(rows[0]);
    });

    it("removes a row but keeps the last one", () => {
        const one = removeCondition(rows, rows[0].id);
        expect(one).toEqual([rows[1]]);
        expect(removeCondition(one, rows[1].id)).toBe(one);
    });
});

describe("geoLabel", () => {
    it("shows the label, or the coordinates without one, and the radius", () => {
        expect(geoLabel({ label: "Scheveningen", lat: 52.1, lon: 4.27, radiusKm: 2 })).toBe("Scheveningen · 2 km");
        expect(geoLabel({ lat: 52.1, lon: 4.27, radiusKm: 0.5 })).toBe("52.1°, 4.27° · 0.5 km");
    });

    it("says when no region is set", () => {
        expect(geoLabel(null)).toBe("No region set");
    });
});

describe("sameGeo", () => {
    const geo = { label: "Pier", lat: 52.1, lon: 4.27, radiusKm: 2 };

    it("compares every field", () => {
        expect(sameGeo(geo, { ...geo })).toBe(true);
        expect(sameGeo(geo, { ...geo, radiusKm: 3 })).toBe(false);
        expect(sameGeo(geo, { ...geo, label: "Other" })).toBe(false);
    });

    it("handles null", () => {
        expect(sameGeo(null, null)).toBe(true);
        expect(sameGeo(geo, null)).toBe(false);
    });
});

describe("geoFromInputs", () => {
    it("reads numbers and numeric strings", () => {
        expect(geoFromInputs(52.1, "4.27", "2")).toEqual({ lat: 52.1, lon: 4.27, radiusKm: 2 });
    });

    it("adds a trimmed label when one is given", () => {
        expect(geoFromInputs(52.1, 4.27, 2, " Pier ")).toEqual({ label: "Pier", lat: 52.1, lon: 4.27, radiusKm: 2 });
        expect(geoFromInputs(52.1, 4.27, 2, "  ")).toEqual({ lat: 52.1, lon: 4.27, radiusKm: 2 });
    });

    it("is null for empty, non-numeric or out-of-range input", () => {
        expect(geoFromInputs("", 4.27, 2)).toBeNull();
        expect(geoFromInputs("abc", 4.27, 2)).toBeNull();
        expect(geoFromInputs(91, 4.27, 2)).toBeNull();
        expect(geoFromInputs(52.1, -181, 2)).toBeNull();
        expect(geoFromInputs(52.1, 4.27, 0)).toBeNull();
    });
});
