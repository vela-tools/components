import { describe, expect, it } from "vitest";
import {
    formatPayload,
    formatTime,
    fromLocalDateTime,
    pageCount,
    pageItems,
    shortEntityId,
    subscriptionTitle,
    toLocalDateTime,
} from "../../src/utils/subscriptions";

describe("formatTime", () => {
    it("formats an ISO time as local YYYY-MM-DD HH:mm:ss", () => {
        const local = new Date(2026, 10, 10, 7, 5, 9).toISOString();
        expect(formatTime(local)).toBe("2026-11-10 07:05:09");
    });

    it("returns empty for no value and the input for an invalid one", () => {
        expect(formatTime(undefined)).toBe("");
        expect(formatTime("not a date")).toBe("not a date");
    });
});

describe("toLocalDateTime and fromLocalDateTime", () => {
    it("convert between ISO and a datetime-local value in local time", () => {
        const iso = new Date(2027, 0, 15, 9, 30).toISOString();
        expect(toLocalDateTime(iso)).toBe("2027-01-15T09:30");
        expect(fromLocalDateTime("2027-01-15T09:30")).toBe(iso);
    });

    it("return empty for no value or an invalid one", () => {
        expect(toLocalDateTime("")).toBe("");
        expect(toLocalDateTime("not a date")).toBe("");
        expect(fromLocalDateTime("")).toBe("");
    });
});

describe("subscriptionTitle", () => {
    it("uses the name, then the description, then the id", () => {
        expect(subscriptionTitle({ id: "urn:s", name: "Hot", description: "Long text" })).toBe("Hot");
        expect(subscriptionTitle({ id: "urn:s", name: "", description: "Long text" })).toBe("Long text");
        expect(subscriptionTitle({ id: "urn:s" })).toBe("urn:s");
    });
});

describe("shortEntityId", () => {
    it("strips the urn:ngsi-ld: prefix", () => {
        expect(shortEntityId("urn:ngsi-ld:CrowdFlowObserved:camera-2-line-1")).toBe(
            "CrowdFlowObserved:camera-2-line-1",
        );
        expect(shortEntityId("plain")).toBe("plain");
        expect(shortEntityId(undefined)).toBe("");
    });
});

describe("formatPayload", () => {
    it("stringifies objects and passes strings through", () => {
        expect(formatPayload({ peopleCount: 104 })).toBe('{"peopleCount":104}');
        expect(formatPayload("raw")).toBe("raw");
        expect(formatPayload(null)).toBe("");
    });
});

describe("pagination", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);

    it("counts at least one page", () => {
        expect(pageCount(0, 20)).toBe(1);
        expect(pageCount(45, 20)).toBe(3);
    });

    it("returns the items of a page and clamps out-of-range pages", () => {
        expect(pageItems(items, 2, 20)).toEqual(items.slice(20, 40));
        expect(pageItems(items, 9, 20)).toEqual(items.slice(40));
        expect(pageItems(items, 0, 20)).toEqual(items.slice(0, 20));
    });
});
