import { describe, expect, it, vi } from "vitest";
import { createHttp, NgsiClientError } from "../src/http";

const ok = (body: unknown, init: ResponseInit = {}) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
        ...init,
    });

function setup(
    config: Partial<Parameters<typeof createHttp>[0]> = {},
    response: Response | (() => Promise<Response>) = ok([]),
) {
    const fetch = vi.fn<typeof globalThis.fetch>(typeof response === "function" ? response : async () => response);
    const http = createHttp({ url: "https://broker.example/ngsi-ld/v1/", fetch, ...config });
    const call = () => fetch.mock.calls[0];
    const headers = () => call()[1]!.headers as Record<string, string>;
    return { http, fetch, call, headers };
}

describe("createHttp", () => {
    it("builds the URL and percent-encodes query values", async () => {
        const { http, call } = setup();
        await http.request("GET", "/entities", {
            query: {
                type: "https://example.org/A,https://example.org/B",
                q: 'name=="a b"',
                limit: 5,
                offset: undefined,
            },
        });
        expect(call()[0]).toBe(
            "https://broker.example/ngsi-ld/v1/entities?type=https%3A%2F%2Fexample.org%2FA%2Chttps%3A%2F%2Fexample.org%2FB&q=name%3D%3D%22a%20b%22&limit=5",
        );
    });

    it("sends Accept, tenant, Link context, token and extra headers", async () => {
        const { http, headers } = setup({
            tenant: "tenant-a",
            context: "https://ctx.example/context.jsonld",
            getToken: async () => "t0k",
            headers: { "User-Agent": "test-client" },
        });
        await http.request("GET", "/types");
        expect(headers()).toEqual({
            Accept: "application/json",
            "User-Agent": "test-client",
            "NGSILD-Tenant": "tenant-a",
            Link: '<https://ctx.example/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
            Authorization: "Bearer t0k",
        });
    });

    it("leaves the Link header out for the core context, which the broker applies anyway", async () => {
        for (const context of [
            "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld",
            "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld",
        ]) {
            const { http, headers } = setup({ context });
            await http.request("GET", "/subscriptions");
            expect(headers()).not.toHaveProperty("Link");
        }
    });

    it("lets a request override a default header", async () => {
        const { http, headers } = setup();
        await http.request("GET", "/subscriptions", { headers: { Accept: "application/ld+json" } });
        expect(headers().Accept).toBe("application/ld+json");
    });

    it("omits optional headers that are not configured", async () => {
        const { http, headers } = setup({ getToken: () => null });
        await http.request("GET", "/types");
        expect(headers()).toEqual({ Accept: "application/json" });
    });

    it("sends a JSON body with Content-Type", async () => {
        const { http, call, headers } = setup({}, new Response(null, { status: 201 }));
        const res = await http.request("POST", "/subscriptions", { body: { a: 1 } });
        expect(call()[1]!.body).toBe('{"a":1}');
        expect(headers()["Content-Type"]).toBe("application/json");
        expect(res).toMatchObject({ status: 201, body: null });
    });

    it("throws NgsiClientError with the ProblemDetails of a failed response", async () => {
        const problem = {
            type: "https://uri.etsi.org/ngsi-ld/errors/ResourceNotFound",
            title: "Resource not found.",
            detail: "x was not found",
            status: 404,
        };
        const { http } = setup({}, ok(problem, { status: 404 }));
        const err = await http.request("GET", "/entities/x").catch((e: unknown) => e);
        expect(err).toBeInstanceOf(NgsiClientError);
        expect(err).toMatchObject({
            status: 404,
            problemType: problem.type,
            title: problem.title,
            detail: problem.detail,
        });
    });

    it("keeps a plain-text error body as detail (e.g. a gateway 502)", async () => {
        const { http } = setup({}, new Response("Failed to connect to upstream server", { status: 502 }));
        await expect(http.request("GET", "/types")).rejects.toMatchObject({
            status: 502,
            detail: "Failed to connect to upstream server",
        });
    });

    it("wraps network errors as status 0", async () => {
        const { http } = setup({}, async () => {
            throw new TypeError("fetch failed");
        });
        await expect(http.request("GET", "/types")).rejects.toMatchObject({ name: "NgsiClientError", status: 0 });
    });

    it("passes the signal and rethrows AbortError unchanged", async () => {
        const ac = new AbortController();
        const { http, call } = setup({}, async () => {
            throw new DOMException("aborted", "AbortError");
        });
        await expect(http.request("GET", "/types", { signal: ac.signal })).rejects.toMatchObject({
            name: "AbortError",
        });
        expect(call()[1]!.signal).toBe(ac.signal);
    });
});
