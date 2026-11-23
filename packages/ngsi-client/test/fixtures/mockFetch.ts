import { vi } from "vitest";

export type Fixture = { status: number; headers: Record<string, string>; body: unknown };
type Route = Fixture | ((url: URL, init: RequestInit) => Fixture);

export function mockFetch(routes: Record<string, Route>) {
    return vi.fn<typeof fetch>(async (input, init = {}) => {
        const url = new URL(String(input));
        const method = init.method ?? "GET";
        const path = decodeURIComponent(url.pathname.replace(/^\/ngsi-ld\/v1/, ""));
        const route = routes[`${method} ${path}`];
        if (!route)
            return new Response(
                JSON.stringify({ type: "https://uri.etsi.org/ngsi-ld/errors/ResourceNotFound", title: "no route" }),
                { status: 404 },
            );
        const f = typeof route === "function" ? route(url, init) : route;
        return new Response(f.body === null ? null : JSON.stringify(f.body), { status: f.status, headers: f.headers });
    });
}

export const BASE = "https://broker.example/ngsi-ld/v1";
