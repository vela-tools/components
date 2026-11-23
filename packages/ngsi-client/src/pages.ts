import type { Http } from "./http";
import { NgsiValidationError } from "./entities";

const PAGE_SIZE = 50;
const MAX_PAGES = 40;

const MAX_ITEMS = PAGE_SIZE * MAX_PAGES;

type PageOptions = {
    query?: Record<string, string | number | undefined>;
    signal?: AbortSignal;
    headers?: Record<string, string>;
    onTruncated?: () => void;
};

export async function allPages(http: Http, path: string, what: string, opts: PageOptions = {}): Promise<unknown[]> {
    const all: unknown[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const { body } = await http.request("GET", path, {
            signal: opts.signal,
            headers: opts.headers,
            query: { ...opts.query, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
        });
        if (!Array.isArray(body))
            throw new NgsiValidationError(`The broker answered with something other than a list of ${what}.`, body);
        all.push(...body);
        if (body.length < PAGE_SIZE) return all;
    }
    opts.onTruncated?.();
    return all;
}

export const truncatedReason = (what: string) => `only the first ${MAX_ITEMS} ${what} were read, the rest are left out`;
