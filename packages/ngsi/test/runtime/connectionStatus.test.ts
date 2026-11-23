import { describe, expect, it } from "vitest";
import { connectionStatusOf } from "../../src/runtime/connectionStatus";

describe("connectionStatusOf", () => {
    it("is connecting while the first request is pending", () => {
        expect(connectionStatusOf({ status: "pending", fetchStatus: "fetching", error: null })).toEqual({
            status: "connecting",
        });
    });

    it("is connected once types have loaded, also while refetching", () => {
        expect(connectionStatusOf({ status: "success", fetchStatus: "idle", error: null })).toEqual({
            status: "connected",
        });
        expect(connectionStatusOf({ status: "success", fetchStatus: "fetching", error: null })).toEqual({
            status: "connected",
        });
    });

    it("is an error with the message when the request failed", () => {
        expect(
            connectionStatusOf({ status: "error", fetchStatus: "idle", error: new Error("502 Bad Gateway") }),
        ).toEqual({
            status: "error",
            error: "502 Bad Gateway",
        });
    });

    it("falls back to a generic message for an error without one", () => {
        expect(connectionStatusOf({ status: "error", fetchStatus: "idle", error: new Error("") })).toEqual({
            status: "error",
            error: "The request failed.",
        });
    });

    it("is connecting again while a failed request is retried", () => {
        expect(connectionStatusOf({ status: "error", fetchStatus: "fetching", error: new Error("down") })).toEqual({
            status: "connecting",
        });
    });
});
