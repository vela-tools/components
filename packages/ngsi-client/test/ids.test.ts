import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUuid } from "../src/ids";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("randomUuid", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("uses crypto.randomUUID when the page is a secure context", () => {
        expect(randomUuid()).toMatch(UUID_V4);
    });

    it("builds a version 4 UUID from random bytes when crypto.randomUUID is missing, as on plain http", () => {
        vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
        const ids = new Set(Array.from({ length: 50 }, randomUuid));
        expect(ids.size).toBe(50);
        for (const id of ids) expect(id).toMatch(UUID_V4);
    });
});
