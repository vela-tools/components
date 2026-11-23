import { describe, expect, it } from "vitest";
import { errorMessage } from "../../src/bound/errorMessage";

const brokerError = (fields: Record<string, unknown>) =>
    Object.assign(new Error("GET https://broker.example/x → 500"), fields);

describe("errorMessage", () => {
    it("shows what the broker said instead of the request line", () => {
        expect(errorMessage(brokerError({ status: 500, title: "Internal error", detail: "database down" }))).toBe(
            "The broker answered 500: database down",
        );
        expect(errorMessage(brokerError({ status: 400, title: "Bad request" }))).toBe(
            "The broker answered 400: Bad request",
        );
        expect(errorMessage(brokerError({ status: 503 }))).toBe("The broker answered 503.");
    });

    it("says the broker could not be reached when the request never got an answer", () => {
        expect(errorMessage(brokerError({ status: 0 }))).toBe("The broker could not be reached.");
    });

    it("shows the message of any other error", () => {
        expect(errorMessage(new Error("subscription x is malformed"))).toBe("subscription x is malformed");
        expect(errorMessage("nope")).toBe("The request failed.");
    });
});
