import { describe, expect, it } from "vitest";
import { contextFromLink, fromTypeRef, isCoreContext, propertyValue, toTypeRef } from "../src/iri";

describe("type refs", () => {
    it("splits type IRIs at the last / or #", () => {
        expect(toTypeRef("https://smartdatamodels.org/dataModel.Device/Camera")).toEqual({
            type: "Camera",
            contextUri: "https://smartdatamodels.org/dataModel.Device/",
        });
        expect(toTypeRef("https://example.org/ns#Thing")).toEqual({
            type: "Thing",
            contextUri: "https://example.org/ns#",
        });
        expect(toTypeRef("Camera")).toEqual({ type: "Camera" });
    });
    it("round-trips", () => {
        const iri = "https://example.org/vela/VirtualCameraSensor";
        expect(fromTypeRef(toTypeRef(iri))).toBe(iri);
        expect(fromTypeRef({ type: "Camera" })).toBe("Camera");
    });
});

describe("attribute helpers", () => {
    it("finds a property by short name, compacted or expanded", () => {
        expect(propertyValue({ status: { type: "Property", value: "ok" } }, "status")).toBe("ok");
        expect(propertyValue({ "https://example.org/status": { type: "Property", value: "ok" } }, "status")).toBe("ok");
        expect(propertyValue({ status: [{ type: "Property", value: "first" }] }, "status")).toBe("first");
        expect(propertyValue({ "https://example.org/ns#status": { type: "Property", value: "ok" } }, "status")).toBe(
            "ok",
        );
        expect(propertyValue({ "urn:x/status": { type: "Property", value: "ok" } }, "status")).toBeUndefined();
        expect(propertyValue({}, "status")).toBeUndefined();
    });
    it("reads the @context from a Link header with several links", () => {
        const link =
            '</ngsi-ld/v1/entities?limit=1&offset=1>;rel="next";type="application/ld+json", <https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"';
        expect(contextFromLink(link)).toBe("https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld");
        expect(contextFromLink(null)).toBeUndefined();
    });

    it("recognises the core context with and without a version", () => {
        expect(isCoreContext("https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld")).toBe(true);
        expect(isCoreContext("https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld")).toBe(true);
        expect(isCoreContext("https://ctx.example/context.jsonld")).toBe(false);
        expect(isCoreContext("https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld.evil")).toBe(false);
    });
});
