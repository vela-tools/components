import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EntitySource, NgsiLdEntity } from "@vela-tools/ngsi";
import { createLiveSource } from "../src/live";

const entity = (value: number) =>
    ({ id: "urn:e:1", type: "T", n: { type: "Property", value } }) as unknown as NgsiLdEntity;

function entitiesReturning(...answers: (NgsiLdEntity[] | Error)[]) {
    const queryEntities = vi.fn(async () => {
        const next = answers.length > 1 ? answers.shift()! : answers[0];
        if (next instanceof Error) throw next;
        return { entities: next };
    });
    return {
        source: { listTypes: vi.fn(), getEntity: vi.fn(), queryEntities } as unknown as EntitySource,
        queryEntities,
    };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("live.watch (polling)", () => {
    it("runs the query at once, then every interval, and reports only changes", async () => {
        const { source, queryEntities } = entitiesReturning([entity(1)], [entity(1)], [entity(2)]);
        const onChange = vi.fn();
        const stop = createLiveSource(source, { url: "x", liveIntervalMs: 5000 }).watch({ q: "n>0" }, onChange);

        await vi.advanceTimersByTimeAsync(0);
        expect(onChange).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(5000);
        expect(onChange).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(5000);
        expect(onChange).toHaveBeenLastCalledWith([entity(2)]);
        expect(queryEntities).toHaveBeenCalledWith(
            { q: "n>0" },
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        stop();
    });

    it("stops polling and aborts the request in flight when unsubscribed", async () => {
        const { source, queryEntities } = entitiesReturning([entity(1)]);
        const stop = createLiveSource(source, { url: "x", liveIntervalMs: 1000 }).watch({}, vi.fn());
        const signal = (queryEntities.mock.calls[0] as unknown as [unknown, { signal: AbortSignal }])[1].signal;
        stop();
        expect(signal.aborted).toBe(true);
        await vi.advanceTimersByTimeAsync(5000);
        expect(queryEntities).toHaveBeenCalledTimes(1);
    });

    it("reports a failed round and keeps polling", async () => {
        const failure = new Error("503");
        const { source } = entitiesReturning(failure, [entity(1)]);
        const onChange = vi.fn();
        const onLiveError = vi.fn();
        const stop = createLiveSource(source, { url: "x", liveIntervalMs: 1000, onLiveError }).watch({}, onChange);
        await vi.advanceTimersByTimeAsync(0);
        expect(onLiveError).toHaveBeenCalledWith(failure);
        await vi.advanceTimersByTimeAsync(1000);
        expect(onChange).toHaveBeenCalledWith([entity(1)]);
        stop();
    });

    it("skips rounds while the page is hidden", async () => {
        const page = { visibilityState: "hidden" };
        vi.stubGlobal("document", page);
        const { source, queryEntities } = entitiesReturning([entity(1)]);
        const stop = createLiveSource(source, { url: "x", liveIntervalMs: 1000 }).watch({}, vi.fn());
        await vi.advanceTimersByTimeAsync(3000);
        expect(queryEntities).not.toHaveBeenCalled();
        page.visibilityState = "visible";
        await vi.advanceTimersByTimeAsync(1000);
        expect(queryEntities).toHaveBeenCalledTimes(1);
        stop();
        vi.unstubAllGlobals();
    });

    it("polls at most once a second", async () => {
        const { source, queryEntities } = entitiesReturning([entity(1)]);
        const stop = createLiveSource(source, { url: "x", liveIntervalMs: 10 }).watch({}, vi.fn());
        await vi.advanceTimersByTimeAsync(999);
        expect(queryEntities).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(queryEntities).toHaveBeenCalledTimes(2);
        stop();
    });
});
