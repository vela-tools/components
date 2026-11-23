import type { NgsiLdClientConfig } from "./config";
import { isCoreContext } from "./iri";

export class NgsiClientError extends Error {
    readonly status: number;
    readonly problemType?: string;
    readonly title?: string;
    readonly detail?: string;
    readonly url: string;

    constructor(init: {
        status: number;
        url: string;
        message: string;
        problemType?: string;
        title?: string;
        detail?: string;
        cause?: unknown;
    }) {
        super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
        this.name = "NgsiClientError";
        this.status = init.status;
        this.url = init.url;
        this.problemType = init.problemType;
        this.title = init.title;
        this.detail = init.detail;
    }
}

type RequestOptions = {
    query?: Record<string, string | number | undefined>;
    body?: unknown;
    signal?: AbortSignal;
    headers?: Record<string, string>;
};

type HttpResponse = { body: unknown; headers: Headers; status: number };

function isAbort(e: unknown): boolean {
    return e instanceof Error && e.name === "AbortError";
}

function queryString(query: RequestOptions["query"]): string {
    const parts = Object.entries(query ?? {})
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return parts.length ? `?${parts.join("&")}` : "";
}

export function createHttp(config: NgsiLdClientConfig) {
    const base = config.url.replace(/\/+$/, "");
    const doFetch = config.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

    async function headersFor(hasBody: boolean): Promise<Record<string, string>> {
        const h: Record<string, string> = { Accept: "application/json", ...config.headers };
        if (hasBody) h["Content-Type"] = "application/json";
        if (config.tenant) h["NGSILD-Tenant"] = config.tenant;
        if (config.context && !isCoreContext(config.context))
            h.Link = `<${config.context}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`;
        const token = await config.getToken?.();
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    }

    async function request(method: string, path: string, opts: RequestOptions = {}): Promise<HttpResponse> {
        const url = base + path + queryString(opts.query);
        const hasBody = opts.body !== undefined;
        let res: Response;
        try {
            res = await doFetch(url, {
                method,
                headers: { ...(await headersFor(hasBody)), ...opts.headers },
                body: hasBody ? JSON.stringify(opts.body) : undefined,
                signal: opts.signal,
            });
        } catch (e) {
            if (isAbort(e)) throw e;
            throw new NgsiClientError({
                status: 0,
                url,
                message: `${method} ${url} failed: ${e instanceof Error ? e.message : String(e)}`,
                cause: e,
            });
        }

        const text = await res.text();
        let body: unknown = null;
        if (text) {
            try {
                body = JSON.parse(text);
            } catch {
                body = text;
            }
        }

        if (!res.ok) {
            const p = (body && typeof body === "object" ? body : {}) as {
                type?: unknown;
                title?: unknown;
                detail?: unknown;
            };
            const str = (v: unknown) => (typeof v === "string" ? v : undefined);
            const detail = str(p.detail) ?? (typeof body === "string" ? body : undefined);
            throw new NgsiClientError({
                status: res.status,
                url,
                problemType: str(p.type),
                title: str(p.title),
                detail,
                message: `${method} ${url} → ${res.status}${detail ? `: ${detail}` : ""}`,
            });
        }
        return { body, headers: res.headers, status: res.status };
    }

    return { request };
}

export type Http = ReturnType<typeof createHttp>;
