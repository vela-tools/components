import { NgsiClientError, type Http } from "./http";

export function createSegmentGetter(http: Http) {
    let encodeTwice = false;

    return async function getBySegment(
        prefix: string,
        value: string,
        opts: { signal?: AbortSignal; query?: Record<string, string | number | undefined> } = {},
    ) {
        const twice = encodeTwice;
        const path = (both: boolean) =>
            `${prefix}/${both ? encodeURIComponent(encodeURIComponent(value)) : encodeURIComponent(value)}`;
        try {
            return await http.request("GET", path(twice), opts);
        } catch (e) {
            if (twice || !value.includes("/") || !(e instanceof NgsiClientError) || e.status !== 405) throw e;
            encodeTwice = true;
            return http.request("GET", path(true), opts);
        }
    };
}
