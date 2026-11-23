import { describe, expect, it } from "vitest";
import { BASE, mockFetch } from "./fixtures/mockFetch";
import sensors from "./fixtures/entities-virtual-camera-sensor.json";
import { createNgsiLdAdapter } from "../src/index";

describe("createNgsiLdAdapter", () => {
    it("provides entities, subscriptions and notifications by default", () => {
        expect(Object.keys(createNgsiLdAdapter({ url: BASE })).sort()).toEqual([
            "entities",
            "notifications",
            "subscriptions",
        ]);
    });

    it("leaves out the features that are turned off", () => {
        const a = createNgsiLdAdapter({ url: BASE, features: { subscriptions: false, notifications: false } });
        expect(Object.keys(a)).toEqual(["entities"]);
    });

    it("adds saved queries only when turned on", () => {
        expect(Object.keys(createNgsiLdAdapter({ url: BASE, features: { savedQueries: true } })).sort()).toEqual([
            "entities",
            "notifications",
            "savedQueries",
            "subscriptions",
        ]);
    });

    it("adds temporal and live only when turned on", () => {
        expect(
            Object.keys(createNgsiLdAdapter({ url: BASE, features: { temporal: true, live: true } })).sort(),
        ).toEqual(["entities", "live", "notifications", "subscriptions", "temporal"]);
    });

    it("works end to end with the shared config", async () => {
        const fetch = mockFetch({ "GET /entities": sensors });
        const a = createNgsiLdAdapter({ url: BASE, tenant: "tenant-a", fetch });
        const { entities } = await a.entities.queryEntities({
            types: [{ type: "VirtualCameraSensor", contextUri: "https://example.org/vela/" }],
        });
        expect(entities).toHaveLength(2);
        expect((fetch.mock.calls[0][1]!.headers as Record<string, string>)["NGSILD-Tenant"]).toBe("tenant-a");
    });
});
