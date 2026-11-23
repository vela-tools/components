import { describe, expect, it } from "vitest";
import { createMockNgsiAdapter } from "../../src/testing/createMockNgsiAdapter";
import { capabilitiesOf } from "../../src/runtime/capabilities";

describe("capabilitiesOf", () => {
    it("enables every capability whose adapter is present", () => {
        expect(capabilitiesOf(createMockNgsiAdapter())).toEqual({
            subscriptions: true,
            notifications: true,
            temporal: true,
            live: true,
            savedQueries: true,
        });
    });

    it("disables every capability with only an entity source", () => {
        const { entities } = createMockNgsiAdapter();
        expect(capabilitiesOf({ entities })).toEqual({
            subscriptions: false,
            notifications: false,
            temporal: false,
            live: false,
            savedQueries: false,
        });
    });

    it("disables only the capabilities whose adapter is missing", () => {
        const adapters = createMockNgsiAdapter(undefined, { capabilities: { subscriptions: false, live: false } });
        expect(capabilitiesOf(adapters)).toEqual({
            subscriptions: false,
            notifications: true,
            temporal: true,
            live: false,
            savedQueries: true,
        });
    });
});
