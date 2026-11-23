import { describe, expect, it, vi } from "vitest";
import { BASE, mockFetch } from "./fixtures/mockFetch";
import notes from "./fixtures/notifications.json";
import { createHttp } from "../src/http";
import { createNotificationSource } from "../src/notifications";
import type { NgsiLdClientConfig } from "../src/config";

function source(config: Partial<NgsiLdClientConfig> = {}) {
    const fetch = mockFetch({ "GET /entities": notes });
    const cfg = { url: BASE, fetch, ...config };
    return { n: createNotificationSource(createHttp(cfg), cfg), fetch };
}

describe("notifications.list", () => {
    it("reads ScorpioNotification entities, newest first, compacted or expanded", async () => {
        const { n, fetch } = source();
        const list = await n.list({});
        expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get("type")).toBe("ScorpioNotification");
        expect(list.map((x) => x.id)).toEqual([
            "urn:ngsi-ld:ScorpioNotification:3",
            "urn:ngsi-ld:ScorpioNotification:2",
            "urn:ngsi-ld:ScorpioNotification:1",
        ]);
        expect(list[2]).toEqual({
            id: "urn:ngsi-ld:ScorpioNotification:1",
            subscriptionId: "urn:ngsi-ld:Subscription:6f1c2a7e",
            receivedAt: "2026-11-10T07:15:00Z",
            status: "delivered",
            source: "ngsi-ld",
            payload: { entityId: "urn:ngsi-ld:CrowdFlowObserved:flow-2", value: 104, threshold: "100" },
        });
        expect(list[1]).toMatchObject({
            status: "failed",
            source: "combined",
            receivedAt: "2026-11-10T08:00:00Z",
            payload: { value: 131 },
        });
    });

    it("asks the broker for one subscription, filters again and applies the limit after filtering", async () => {
        const { n, fetch } = source();
        const list = await n.list({ subscriptionId: "urn:ngsi-ld:Subscription:6f1c2a7e", limit: 1 });
        expect(list.map((x) => x.id)).toEqual(["urn:ngsi-ld:ScorpioNotification:2"]);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get("q")).toBe(
            'subscriptionId=="urn:ngsi-ld:Subscription:6f1c2a7e"',
        );
    });

    it("reads a notification without a subscription id as belonging to none", async () => {
        const { n } = source();
        const list = await n.list({});
        expect(list.find((x) => x.id === "urn:ngsi-ld:ScorpioNotification:3")!.subscriptionId).toBe("");
        expect(await n.list({ subscriptionId: "Camera reports a fault" })).toEqual([]);
    });

    it("uses the configured entity type", async () => {
        const { n, fetch } = source({ notificationEntityType: "https://example.org/vela/Notification" });
        await n.list({ limit: 5 });
        expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get("type")).toBe(
            "https://example.org/vela/Notification",
        );
    });

    it("reads every page before sorting, so the newest come first", async () => {
        const entity = (i: number) => ({
            id: `urn:ngsi-ld:ScorpioNotification:${i}`,
            type: "ScorpioNotification",
            timestamp: { type: "Property", value: `2026-11-10T00:00:${String(i % 60).padStart(2, "0")}Z` },
        });
        const fetch = mockFetch({
            "GET /entities": (url) => {
                const offset = Number(url.searchParams.get("offset"));
                const body = offset === 0 ? Array.from({ length: 50 }, (_, i) => entity(i)) : [entity(59)];
                return { status: 200, headers: {}, body };
            },
        });
        const cfg = { url: BASE, fetch };
        const list = await createNotificationSource(createHttp(cfg), cfg).list({ limit: 1 });
        expect(fetch.mock.calls.map(([u]) => new URL(String(u)).searchParams.get("offset"))).toEqual(["0", "50"]);
        expect(list.map((x) => x.id)).toEqual(["urn:ngsi-ld:ScorpioNotification:59"]);
    });

    it("reports when it stops reading before the last page", async () => {
        const entity = (i: number) => ({ id: `urn:ngsi-ld:ScorpioNotification:${i}`, type: "ScorpioNotification" });
        const fetch = mockFetch({
            "GET /entities": (url) => {
                const offset = Number(url.searchParams.get("offset"));
                return { status: 200, headers: {}, body: Array.from({ length: 50 }, (_, i) => entity(offset + i)) };
            },
        });
        const onInvalid = vi.fn();
        const cfg = { url: BASE, fetch, onInvalid };
        const list = await createNotificationSource(createHttp(cfg), cfg).list({});
        expect(list).toHaveLength(2000);
        expect(onInvalid).toHaveBeenCalledTimes(1);
        expect(onInvalid).toHaveBeenCalledWith({
            kind: "notification",
            value: undefined,
            reason: "only the first 2000 notifications were read, the rest are left out",
        });
    });

    it("does not report a list that ends on a short page", async () => {
        const onInvalid = vi.fn();
        await source({ onInvalid }).n.list({});
        expect(onInvalid).not.toHaveBeenCalled();
    });
});
