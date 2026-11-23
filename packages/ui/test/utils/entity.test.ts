import { describe, expect, it } from "vitest";
import type { CellComponent } from "tabulator-tables";
import { generateTypeColors, lightenColor } from "../../src/utils/color";
import {
    columnGroups,
    entityAttributeRows,
    entityRows,
    typeBadgeFormatter,
    type EntityRecord,
} from "../../src/utils/entity";

const camera: EntityRecord = {
    id: "urn:ngsi-ld:Camera:camera-1",
    type: "Camera",
    "@context": "https://example.invalid/context.jsonld",
    status: { type: "Property", value: "ok", observedAt: "2026-11-10T08:00:00Z" },
    config: { type: "Property", value: { fps: 25 } },
    location: { type: "GeoProperty", value: { type: "Point", coordinates: [4.3, 52.1] } },
    hasDevice: { type: "Relationship", object: "urn:ngsi-ld:Device:1", modifiedAt: "2026-11-09T00:00:00Z" },
};

const crowd: EntityRecord = {
    id: "urn:ngsi-ld:CrowdFlowObserved:1",
    type: "CrowdFlowObserved",
    peopleCount: [
        { type: "Property", value: 42, observedAt: "2026-11-10T08:00:00Z" },
        { type: "Property", value: 17, observedAt: "2026-11-10T08:00:00Z" },
    ],
};

const cell = (value: unknown) => ({ getValue: () => value }) as unknown as CellComponent;

describe("entityAttributeRows", () => {
    it("lists attributes without id, type and @context by default", () => {
        expect(entityAttributeRows(camera).map((r) => r.key)).toEqual(["status", "config", "location", "hasDevice"]);
    });

    it("includes id and type on request", () => {
        expect(entityAttributeRows(camera, { includeIdAndType: true }).slice(0, 2)).toEqual([
            { key: "id", value: camera.id },
            { key: "type", value: "Camera" },
        ]);
    });

    it("formats Property, GeoProperty and Relationship values", () => {
        const rows = Object.fromEntries(entityAttributeRows(camera).map((r) => [r.key, r]));
        expect(rows.status).toEqual({
            key: "status",
            type: "Property",
            value: "ok",
            observedAt: "2026-11-10T08:00:00Z",
        });
        expect(rows.config.value).toBe('{"fps":25}');
        expect(rows.location.value).toBe("Point [4.3,52.1]");
        expect(rows.hasDevice).toMatchObject({
            type: "Relationship",
            value: "urn:ngsi-ld:Device:1",
            observedAt: "2026-11-09T00:00:00Z",
        });
    });

    it("joins the values of multi-instance attributes", () => {
        expect(entityAttributeRows(crowd)[0]).toMatchObject({ key: "peopleCount", type: "Property", value: "42 | 17" });
    });

    it("returns nothing for a missing entity", () => {
        expect(entityAttributeRows(null)).toEqual([]);
    });
});

describe("entityRows", () => {
    it("flattens entities into rows that keep the raw entity", () => {
        const [row] = entityRows([camera]);
        expect(row).toMatchObject({ id: camera.id, type: "Camera", status: "ok" });
        expect(row._raw).toBe(camera);
        expect(row).not.toHaveProperty("@context");
    });
});

describe("columnGroups", () => {
    it("collects the attribute names per type", () => {
        expect(columnGroups([camera, crowd, { id: "x", type: "Camera", extra: 1 }])).toEqual([
            { type: "Camera", attributes: ["status", "config", "location", "hasDevice", "extra"] },
            { type: "CrowdFlowObserved", attributes: ["peopleCount"] },
        ]);
    });
});

describe("typeBadgeFormatter", () => {
    it("returns the escaped value without colours", () => {
        expect(typeBadgeFormatter()(cell("<b>Camera</b>"))).toBe("&lt;b&gt;Camera&lt;/b&gt;");
    });

    it("wraps the value in a coloured badge", () => {
        const html = typeBadgeFormatter({ Camera: "#2563eb" })(cell("Camera"));
        expect(html).toContain("color:#2563eb");
        expect(html).toContain(">Camera</span>");
    });

    it("escapes every HTML special character", () => {
        expect(typeBadgeFormatter()(cell(`&<>"'`))).toBe("&amp;&lt;&gt;&quot;&#39;");
    });

    it("escapes HTML inside the badge", () => {
        expect(typeBadgeFormatter({})(cell("<img onerror=x>"))).toContain("&lt;img onerror=x&gt;");
    });
});

describe("colors", () => {
    it("lightens towards white", () => {
        expect(lightenColor("#000000", 100)).toBe("#ffffff");
        expect(lightenColor("#000000", 0)).toBe("#000000");
    });

    it("gives every type a distinct colour", () => {
        const colors = generateTypeColors(["A", "B", "C"]);
        expect(Object.keys(colors)).toEqual(["A", "B", "C"]);
        expect(new Set(Object.values(colors)).size).toBe(3);
    });
});
