import { describe, expect, it } from "vitest";
import crowd from "./fixtures/entities-crowd-flow.json";
import sensors from "./fixtures/entities-virtual-camera-sensor.json";
import types from "./fixtures/types.json";
import details from "./fixtures/types-details.json";
import { entitySchema, typeListSchema } from "../src/schemas";

describe("entitySchema", () => {
    it("accepts every entity from the broker fixtures", () => {
        for (const e of [...crowd.body, ...sensors.body]) expect(entitySchema.safeParse(e).success).toBe(true);
    });

    it("accepts multi-instance attributes and newer attribute kinds", () => {
        const e = {
            id: "urn:x",
            type: "T",
            count: [
                { type: "Property", value: 1, datasetId: "urn:a" },
                { type: "Property", value: 2, datasetId: "urn:b" },
            ],
            label: { type: "LanguageProperty", languageMap: { en: "x" } },
        };
        expect(entitySchema.safeParse(e).success).toBe(true);
    });

    it.each([
        ["no id", { type: "T" }],
        ["empty type", { id: "urn:x", type: "" }],
        ["Property without value", { id: "urn:x", type: "T", a: { type: "Property" } }],
        [
            "GeoProperty with a bad geometry",
            { id: "urn:x", type: "T", loc: { type: "GeoProperty", value: { type: "Point", coordinates: ["a"] } } },
        ],
        ["Relationship without object", { id: "urn:x", type: "T", r: { type: "Relationship" } }],
        ["attribute that is not an object", { id: "urn:x", type: "T", a: 5 }],
    ])("rejects an entity with %s", (_, e) => {
        expect(entitySchema.safeParse(e).success).toBe(false);
    });
});

describe("typeListSchema", () => {
    it("reads the EntityTypeList shape", () => {
        expect(typeListSchema.parse(types.body)).toContain("https://example.org/vela/VirtualCameraSensor");
    });
    it("reads the details=true shape", () => {
        expect(typeListSchema.parse(details.body)).toEqual(details.body.map((t) => t.typeName));
    });
    it("reads the older { types } and string[] shapes", () => {
        expect(typeListSchema.parse({ types: ["A"] })).toEqual(["A"]);
        expect(typeListSchema.parse(["A", "B"])).toEqual(["A", "B"]);
    });
    it("reads the answer of a broker without entities as no types", () => {
        expect(typeListSchema.parse(null)).toEqual([]);
        expect(typeListSchema.parse("")).toEqual([]);
        expect(typeListSchema.parse({})).toEqual([]);
        expect(typeListSchema.parse({ id: "urn:ngsi-ld:EntityTypeList:1", type: "EntityTypeList" })).toEqual([]);
        expect(typeListSchema.parse({ typeList: [] })).toEqual([]);
        expect(typeListSchema.parse([])).toEqual([]);
    });
    it("still refuses an answer that is not a type list", () => {
        expect(typeListSchema.safeParse({ title: "Bad request" }).success).toBe(false);
        expect(typeListSchema.safeParse("Failed to connect").success).toBe(false);
    });
});
