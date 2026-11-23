import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NgsiAdapters } from "../../src/adapters";
import type { Subscription, SubscriptionDraft } from "../../src/types";
import { createMockNgsiAdapter, defaultMockFixtures, MockAdapterError } from "../../src/testing/createMockNgsiAdapter";
import { fixtureSavedQueries, fixtureSubscriptions, fixtureTypes } from "../../src/testing/fixtures";
import { createCommands, type NgsiCommands } from "../../src/runtime/commands";
import { ngsiKeys } from "../../src/runtime/queryKeys";
import { createSelectionStore, type SelectionStore } from "../../src/runtime/store";

const BROKER = "test";
const CAMERA_ID = "urn:ngsi-ld:Camera:camera-1";

let queryClient: QueryClient;
let store: SelectionStore;
let commands: NgsiCommands;
const adapters = createMockNgsiAdapter();

const loadTypes = () =>
    queryClient.fetchQuery({ queryKey: ngsiKeys.types(BROKER), queryFn: () => adapters.entities.listTypes() });

const loadEntity = (id: string) =>
    queryClient.fetchQuery({ queryKey: ngsiKeys.entity(BROKER, id), queryFn: () => adapters.entities.getEntity(id) });

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    store = createSelectionStore();
    commands = createCommands(store, queryClient, BROKER, adapters);
});

describe("selectTypes", () => {
    it("accepts any types while the type list is still loading", () => {
        expect(commands.selectTypes([{ type: "Nope" }])).toEqual({ ok: true });
        expect(store.getState().types).toEqual([{ type: "Nope" }]);
    });

    it("rejects unknown types once the list is loaded and leaves the store alone", async () => {
        await loadTypes();
        const before = store.getState();
        expect(commands.selectTypes([{ type: "Nope" }])).toEqual({ ok: false, reason: "unknown-type" });
        expect(store.getState()).toBe(before);
    });

    it("sets the types on the selection and the active query", async () => {
        await loadTypes();
        expect(commands.selectTypes([fixtureTypes.Camera])).toEqual({ ok: true });
        expect(store.getState().types).toEqual([fixtureTypes.Camera]);
        expect(store.getState().query.types).toEqual([fixtureTypes.Camera]);
    });

    it("keeps the entity and attribute when the entity still matches", async () => {
        await Promise.all([loadTypes(), loadEntity(CAMERA_ID)]);
        commands.selectEntity(CAMERA_ID);
        commands.selectAttribute("status");
        commands.selectTypes([fixtureTypes.Camera, fixtureTypes.OSMPlace]);
        expect(store.getState()).toMatchObject({ entityId: CAMERA_ID, attribute: "status" });
    });

    it("clears the entity and attribute when the entity no longer matches", async () => {
        await Promise.all([loadTypes(), loadEntity(CAMERA_ID)]);
        commands.selectEntity(CAMERA_ID);
        commands.selectAttribute("status");
        commands.selectTypes([fixtureTypes.OSMPlace]);
        expect(store.getState()).toMatchObject({ entityId: null, attribute: null });
    });

    it("clears the entity when it is not loaded, since it cannot be checked", async () => {
        await loadTypes();
        commands.selectEntity(CAMERA_ID);
        commands.selectTypes([fixtureTypes.Camera]);
        expect(store.getState().entityId).toBeNull();
    });

    it("does not notify listeners when the same types are selected again", () => {
        commands.selectTypes([fixtureTypes.Camera]);
        const listener = vi.fn();
        store.subscribe(listener);
        commands.selectTypes([{ type: "Camera", contextUri: fixtureTypes.Camera.contextUri }]);
        expect(listener).not.toHaveBeenCalled();
    });
});

describe("setQuery", () => {
    const geo = { lat: 52.08, lon: 4.31, radiusKm: 2 };

    const invalidated = () =>
        queryClient
            .getQueryCache()
            .getAll()
            .filter((q) => q.state.isInvalidated)
            .map((q) => q.queryKey);

    it("replaces the active query and syncs the selected types", async () => {
        await loadTypes();
        const query = { types: [fixtureTypes.Camera], q: 'status=="on"', geo };
        expect(commands.setQuery(query)).toEqual({ ok: true });
        expect(store.getState().query).toEqual(query);
        expect(store.getState().types).toEqual([fixtureTypes.Camera]);
    });

    it("rejects an invalid query and leaves the store alone", async () => {
        await loadTypes();
        const before = store.getState();
        expect(commands.setQuery({ types: [{ type: "Nope" }] })).toEqual({ ok: false, reason: "unknown-type" });
        expect(commands.setQuery({ q: " " })).toEqual({ ok: false, reason: "empty-q" });
        expect(commands.setQuery({ geo: { ...geo, radiusKm: 0 } })).toEqual({ ok: false, reason: "invalid-geo" });
        expect(commands.setQuery({ limit: -1 })).toEqual({ ok: false, reason: "invalid-paging" });
        expect(store.getState()).toBe(before);
    });

    it("accepts any types while the type list is still loading", () => {
        expect(commands.setQuery({ types: [{ type: "Nope" }] })).toEqual({ ok: true });
        expect(store.getState().types).toEqual([{ type: "Nope" }]);
    });

    it("keeps the entity and attribute when the types do not change", async () => {
        await Promise.all([loadTypes(), loadEntity(CAMERA_ID)]);
        commands.selectTypes([fixtureTypes.Camera]);
        commands.selectEntity(CAMERA_ID);
        commands.selectAttribute("status");
        commands.setQuery({ types: [fixtureTypes.Camera], q: 'status=="on"' });
        expect(store.getState()).toMatchObject({ entityId: CAMERA_ID, attribute: "status" });
    });

    it("clears the entity and attribute when the new types no longer match it", async () => {
        await Promise.all([loadTypes(), loadEntity(CAMERA_ID)]);
        commands.selectTypes([fixtureTypes.Camera]);
        commands.selectEntity(CAMERA_ID);
        commands.selectAttribute("status");
        commands.setQuery({ types: [fixtureTypes.OSMPlace] });
        expect(store.getState()).toMatchObject({ types: [fixtureTypes.OSMPlace], entityId: null, attribute: null });
    });

    it("refetches the entity lists, without notifying listeners, when the active query is run again", async () => {
        await loadTypes();
        const query = { types: [fixtureTypes.Camera], q: 'status=="on"' };
        await queryClient.fetchQuery({
            queryKey: ngsiKeys.entities(BROKER, query),
            queryFn: () => adapters.entities.queryEntities(query),
        });
        commands.setQuery(query);
        const listener = vi.fn();
        store.subscribe(listener);

        expect(commands.setQuery({ q: 'status=="on"', types: [fixtureTypes.Camera] })).toEqual({ ok: true });
        expect(listener).not.toHaveBeenCalled();
        expect(invalidated()).toEqual([ngsiKeys.entities(BROKER, query)]);
    });

    it("does not refetch when the query changes, since the new key loads on its own", async () => {
        await loadTypes();
        await queryClient.fetchQuery({ queryKey: ngsiKeys.entities(BROKER, {}), queryFn: () => ({ entities: [] }) });
        commands.setQuery({ q: 'status=="on"' });
        expect(invalidated()).toEqual([]);
    });
});

describe("setGeoFilter", () => {
    const geo = { lat: 52.08, lon: 4.31, radiusKm: 2 };

    it("sets only the geo part of the active query", async () => {
        await loadTypes();
        commands.setQuery({ types: [fixtureTypes.Camera], q: 'status=="on"' });
        expect(commands.setGeoFilter(geo)).toEqual({ ok: true });
        expect(store.getState().query).toEqual({ types: [fixtureTypes.Camera], q: 'status=="on"', geo });
    });

    it("removes the geo key with null", () => {
        commands.setGeoFilter(geo);
        expect(commands.setGeoFilter(null)).toEqual({ ok: true });
        expect(store.getState().query).toEqual({});
        expect("geo" in store.getState().query).toBe(false);
    });

    it("rejects an invalid filter and leaves the store alone", () => {
        const before = store.getState();
        expect(commands.setGeoFilter({ ...geo, radiusKm: -1 })).toEqual({ ok: false, reason: "invalid-radius" });
        expect(commands.setGeoFilter({ ...geo, lon: 200 })).toEqual({ ok: false, reason: "invalid-coordinates" });
        expect(store.getState()).toBe(before);
    });

    it("does not notify listeners when the filter is unchanged", () => {
        commands.setGeoFilter(geo);
        const listener = vi.fn();
        store.subscribe(listener);
        commands.setGeoFilter({ ...geo });
        commands.setGeoFilter(null);
        commands.setGeoFilter(null);
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe("selectEntity", () => {
    it("sets the entity and clears the attribute", async () => {
        await loadEntity(CAMERA_ID);
        commands.selectEntity(CAMERA_ID);
        commands.selectAttribute("status");
        expect(commands.selectEntity("urn:ngsi-ld:Camera:camera-2")).toEqual({ ok: true });
        expect(store.getState()).toMatchObject({ entityId: "urn:ngsi-ld:Camera:camera-2", attribute: null });
    });

    it("keeps the attribute when the same entity is selected again", async () => {
        await loadEntity(CAMERA_ID);
        commands.selectEntity(CAMERA_ID);
        commands.selectAttribute("status");
        commands.selectEntity(CAMERA_ID);
        expect(store.getState().attribute).toBe("status");
    });
});

describe("selectAttribute", () => {
    it("rejects without a selected entity", () => {
        expect(commands.selectAttribute("status")).toEqual({ ok: false, reason: "no-entity-selected" });
        expect(store.getState().attribute).toBeNull();
    });

    it("rejects an attribute the loaded entity lacks", async () => {
        await loadEntity(CAMERA_ID);
        commands.selectEntity(CAMERA_ID);
        expect(commands.selectAttribute("peopleCount")).toEqual({ ok: false, reason: "attribute-not-on-entity" });
    });

    it("rejects when the broker reported the entity as missing", async () => {
        await loadEntity("urn:ngsi-ld:Camera:nope");
        commands.selectEntity("urn:ngsi-ld:Camera:nope");
        expect(commands.selectAttribute("status")).toEqual({ ok: false, reason: "entity-not-found" });
    });

    it("accepts an attribute the entity has, and clearing", async () => {
        await loadEntity(CAMERA_ID);
        commands.selectEntity(CAMERA_ID);
        expect(commands.selectAttribute("status")).toEqual({ ok: true });
        expect(store.getState().attribute).toBe("status");
        expect(commands.selectAttribute(null)).toEqual({ ok: true });
        expect(store.getState().attribute).toBeNull();
    });
});

describe("selectAttribute with an explicit entity", () => {
    const CA02 = "urn:ngsi-ld:Camera:camera-2";

    it("selects the entity and attribute in one update when the entity is not selected", async () => {
        await loadEntity(CAMERA_ID);
        const listener = vi.fn();
        store.subscribe(listener);
        expect(commands.selectAttribute("status", { entityId: CAMERA_ID })).toEqual({ ok: true });
        expect(store.getState()).toMatchObject({ entityId: CAMERA_ID, attribute: "status" });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("switches from another selected entity", async () => {
        await loadEntity(CAMERA_ID);
        await loadEntity(CA02);
        commands.selectEntity(CA02);
        commands.selectAttribute("status");
        expect(commands.selectAttribute("status", { entityId: CAMERA_ID })).toEqual({ ok: true });
        expect(store.getState()).toMatchObject({ entityId: CAMERA_ID, attribute: "status" });
    });

    it("checks the attribute against the given entity, not the selected one", async () => {
        await loadEntity(CAMERA_ID);
        await loadEntity("urn:ngsi-ld:Camera:nope");
        commands.selectEntity(CAMERA_ID);
        expect(commands.selectAttribute("status", { entityId: "urn:ngsi-ld:Camera:nope" })).toEqual({
            ok: false,
            reason: "entity-not-found",
        });
        expect(commands.selectAttribute("peopleCount", { entityId: CAMERA_ID })).toEqual({
            ok: false,
            reason: "attribute-not-on-entity",
        });
        expect(store.getState()).toMatchObject({ entityId: CAMERA_ID, attribute: null });
    });

    it("rejects reserved attributes", () => {
        expect(commands.selectAttribute("id", { entityId: CAMERA_ID })).toEqual({
            ok: false,
            reason: "reserved-attribute",
        });
        expect(store.getState().entityId).toBeNull();
    });

    it("accepts any attribute while the given entity is not loaded", () => {
        expect(commands.selectAttribute("anything", { entityId: CA02 })).toEqual({ ok: true });
        expect(store.getState()).toMatchObject({ entityId: CA02, attribute: "anything" });
    });

    it("behaves as before when the given entity is the selected one", async () => {
        await loadEntity(CAMERA_ID);
        commands.selectEntity(CAMERA_ID);
        commands.selectAttribute("status", { entityId: CAMERA_ID });
        const listener = vi.fn();
        store.subscribe(listener);
        expect(commands.selectAttribute("status", { entityId: CAMERA_ID })).toEqual({ ok: true });
        expect(listener).not.toHaveBeenCalled();
        expect(commands.selectAttribute(null, { entityId: CAMERA_ID })).toEqual({ ok: true });
        expect(store.getState()).toMatchObject({ entityId: CAMERA_ID, attribute: null });
    });
});

describe("refresh", () => {
    const invalidated = () =>
        queryClient
            .getQueryCache()
            .getAll()
            .filter((q) => q.state.isInvalidated)
            .map((q) => q.queryKey);

    beforeEach(async () => {
        await Promise.all([
            loadTypes(),
            loadEntity(CAMERA_ID),
            queryClient.fetchQuery({
                queryKey: ngsiKeys.entities(BROKER, { types: [fixtureTypes.Camera] }),
                queryFn: () => adapters.entities.queryEntities({ types: [fixtureTypes.Camera] }),
            }),
            queryClient.fetchQuery({ queryKey: ngsiKeys.types("other"), queryFn: () => [] }),
        ]);
    });

    it("invalidates everything for this broker only", () => {
        commands.refresh();
        expect(invalidated()).toHaveLength(3);
        expect(invalidated()).not.toContainEqual(ngsiKeys.types("other"));
    });

    it("invalidates only the type list", () => {
        commands.refresh("types");
        expect(invalidated()).toEqual([ngsiKeys.types(BROKER)]);
    });

    it("invalidates entity lists and entities by id", () => {
        commands.refresh("entities");
        expect(invalidated()).toHaveLength(2);
        expect(invalidated()).not.toContainEqual(ngsiKeys.types(BROKER));
    });

    it("invalidates a single entity", () => {
        expect(commands.refresh({ entityId: CAMERA_ID })).toEqual({ ok: true });
        expect(invalidated()).toEqual([ngsiKeys.entity(BROKER, CAMERA_ID)]);
    });
});

describe("subscription commands", () => {
    const CROWD_HIGH = "urn:ngsi-ld:Subscription:crowd-high";
    const draft: SubscriptionDraft = {
        name: "Camera goes offline",
        types: [fixtureTypes.Camera],
        watchedAttributes: ["status"],
        q: 'status=="offline"',
        endpoint: { uri: "https://hook.example/notify" },
    };

    let subAdapters: NgsiAdapters;
    let subCommands: NgsiCommands;

    const setup = (adapterSet: NgsiAdapters) => {
        subAdapters = adapterSet;
        subCommands = createCommands(store, queryClient, BROKER, subAdapters);
    };

    const loadSubscriptions = () =>
        queryClient.fetchQuery({
            queryKey: ngsiKeys.subscriptions(BROKER),
            queryFn: () => subAdapters.subscriptions!.list(),
        });

    const loadNotifications = () =>
        queryClient.fetchQuery({
            queryKey: ngsiKeys.notifications(BROKER, {}),
            queryFn: () => subAdapters.notifications!.list({}),
        });

    const isInvalidated = (queryKey: readonly unknown[]) => queryClient.getQueryState(queryKey)?.isInvalidated;

    beforeEach(() => setup(createMockNgsiAdapter()));

    describe("create", () => {
        it("creates the subscription, returns it and invalidates the list", async () => {
            await loadSubscriptions();
            const result = await subCommands.subscriptions.create(draft);

            expect(result).toEqual({ ok: true, subscription: expect.objectContaining({ ...draft, status: "active" }) });
            expect(isInvalidated(ngsiKeys.subscriptions(BROKER))).toBe(true);
            expect(await subAdapters.subscriptions!.list()).toHaveLength(fixtureSubscriptions.length + 1);
        });

        it("rejects an incomplete draft with its issues, without calling the adapter", async () => {
            const create = vi.spyOn(subAdapters.subscriptions!, "create");

            expect(await subCommands.subscriptions.create({ ...draft, types: [] })).toEqual({
                ok: false,
                reason: "invalid-draft",
                issues: [{ field: "types", message: "Pick at least one entity type." }],
            });
            expect(create).not.toHaveBeenCalled();
        });

        it("rejects types the broker does not have, once the type list is loaded", async () => {
            await loadTypes();
            const create = vi.spyOn(subAdapters.subscriptions!, "create");

            expect(await subCommands.subscriptions.create({ ...draft, types: [{ type: "Nope" }] })).toEqual({
                ok: false,
                reason: "invalid-draft",
                issues: [{ field: "types", message: "One of the selected types is not on this broker." }],
            });
            expect(create).not.toHaveBeenCalled();
        });

        it("rejects without a subscriptions adapter", async () => {
            setup(createMockNgsiAdapter(undefined, { capabilities: { subscriptions: false } }));

            expect(await subCommands.subscriptions.create(draft)).toEqual({
                ok: false,
                reason: "no-subscriptions-adapter",
            });
        });

        it("returns request-failed with the error and leaves the list valid when the adapter fails", async () => {
            setup(createMockNgsiAdapter(undefined, { failOn: ["subscriptions.create"] }));
            await loadSubscriptions();

            const result = await subCommands.subscriptions.create(draft);

            expect(result).toEqual({ ok: false, reason: "request-failed", error: expect.any(MockAdapterError) });
            expect(isInvalidated(ngsiKeys.subscriptions(BROKER))).toBe(false);
        });
    });

    describe("update", () => {
        it("sends the patch, returns the merged subscription and invalidates the list", async () => {
            await loadSubscriptions();
            const update = vi.spyOn(subAdapters.subscriptions!, "update");

            const result = await subCommands.subscriptions.update(CROWD_HIGH, { name: "Busy", q: "peopleCount>5" });

            expect(result).toEqual({
                ok: true,
                subscription: expect.objectContaining({ id: CROWD_HIGH, name: "Busy", q: "peopleCount>5" }),
            });
            expect(update).toHaveBeenCalledWith(CROWD_HIGH, { name: "Busy", q: "peopleCount>5" });
            expect(isInvalidated(ngsiKeys.subscriptions(BROKER))).toBe(true);
            expect(await subAdapters.subscriptions!.get(CROWD_HIGH)).toMatchObject({ name: "Busy" });
        });

        it("reads the subscription from the adapter when the list is not loaded", async () => {
            const get = vi.spyOn(subAdapters.subscriptions!, "get");
            expect(await subCommands.subscriptions.update(CROWD_HIGH, { name: "Busy" })).toMatchObject({ ok: true });
            expect(get).toHaveBeenCalledWith(CROWD_HIGH);
        });

        it("rejects a subscription the broker does not have", async () => {
            expect(await subCommands.subscriptions.update("urn:nope", { name: "Busy" })).toEqual({
                ok: false,
                reason: "subscription-not-found",
            });
        });

        it("rejects a patch that breaks the subscription, with its issues, without calling the adapter", async () => {
            await loadSubscriptions();
            const update = vi.spyOn(subAdapters.subscriptions!, "update");

            expect(await subCommands.subscriptions.update(CROWD_HIGH, { types: [] })).toEqual({
                ok: false,
                reason: "invalid-draft",
                issues: [{ field: "types", message: "Pick at least one entity type." }],
            });
            expect(update).not.toHaveBeenCalled();
        });

        it("sends status active with an expiry that brings an expired subscription back, so a strict broker revives it", async () => {
            const crowd = fixtureSubscriptions.find((s) => s.id === CROWD_HIGH)!;
            setup(
                createMockNgsiAdapter({ ...defaultMockFixtures(), subscriptions: [{ ...crowd, status: "expired" }] }),
            );
            await loadSubscriptions();
            const update = vi.spyOn(subAdapters.subscriptions!, "update");
            const expiresAt = new Date(Date.now() + 86_400_000).toISOString();

            const result = await subCommands.subscriptions.update(CROWD_HIGH, { name: "Back", expiresAt });

            expect(update).toHaveBeenCalledWith(CROWD_HIGH, { name: "Back", expiresAt, status: "active" });
            expect(result).toMatchObject({ ok: true, subscription: { status: "active" } });
        });

        it("does not send a status when the expiry changes on a subscription that is not expired", async () => {
            await loadSubscriptions();
            const update = vi.spyOn(subAdapters.subscriptions!, "update");
            const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
            await subCommands.subscriptions.update(CROWD_HIGH, { expiresAt });
            expect(update).toHaveBeenCalledWith(CROWD_HIGH, { expiresAt });
        });

        it("does not call the adapter for an empty patch", async () => {
            await loadSubscriptions();
            const update = vi.spyOn(subAdapters.subscriptions!, "update");
            expect(await subCommands.subscriptions.update(CROWD_HIGH, {})).toMatchObject({
                ok: true,
                subscription: { id: CROWD_HIGH },
            });
            expect(update).not.toHaveBeenCalled();
        });

        it("returns request-failed when the adapter fails, with the subscription read again", async () => {
            setup(createMockNgsiAdapter(undefined, { failOn: ["subscriptions.update"] }));
            await loadSubscriptions();
            expect(await subCommands.subscriptions.update(CROWD_HIGH, { name: "Busy" })).toEqual({
                ok: false,
                reason: "request-failed",
                error: expect.any(MockAdapterError),
                subscription: expect.objectContaining({ id: CROWD_HIGH }),
            });
        });

        it("puts what the broker has after a failed update into the list", async () => {
            setup(createMockNgsiAdapter(undefined, { failOn: ["subscriptions.update"] }));
            const list = await loadSubscriptions();
            const original = list.find((s) => s.id === CROWD_HIGH)!;
            vi.spyOn(subAdapters.subscriptions!, "get").mockResolvedValueOnce({
                ...original,
                description: "partly applied",
            });

            const result = await subCommands.subscriptions.update(CROWD_HIGH, {
                name: "Busy",
                description: "partly applied",
            });

            expect(result).toMatchObject({
                ok: false,
                reason: "request-failed",
                subscription: { description: "partly applied" },
            });
            const cached = queryClient.getQueryData<Subscription[]>(ngsiKeys.subscriptions(BROKER))!;
            const item = cached.find((s) => s.id === CROWD_HIGH);
            expect(item?.description).toBe("partly applied");
            expect(item?.name).not.toBe("Busy");
        });

        it("drops the subscription from the list when it is gone after a failed update", async () => {
            setup(createMockNgsiAdapter(undefined, { failOn: ["subscriptions.update"] }));
            await loadSubscriptions();
            vi.spyOn(subAdapters.subscriptions!, "get").mockResolvedValueOnce(null);

            expect(await subCommands.subscriptions.update(CROWD_HIGH, { name: "Busy" })).toMatchObject({
                ok: false,
                subscription: null,
            });
            expect(
                queryClient
                    .getQueryData<Subscription[]>(ngsiKeys.subscriptions(BROKER))!
                    .some((s) => s.id === CROWD_HIGH),
            ).toBe(false);
        });

        it("rejects without a subscriptions adapter", async () => {
            setup(createMockNgsiAdapter(undefined, { capabilities: { subscriptions: false } }));
            expect(await subCommands.subscriptions.update(CROWD_HIGH, {})).toEqual({
                ok: false,
                reason: "no-subscriptions-adapter",
            });
        });
    });

    describe("setStatus", () => {
        it("changes the status and invalidates the list", async () => {
            await loadSubscriptions();

            expect(await subCommands.subscriptions.setStatus(CROWD_HIGH, "paused")).toEqual({ ok: true });
            expect(isInvalidated(ngsiKeys.subscriptions(BROKER))).toBe(true);
            expect((await subAdapters.subscriptions!.list()).find((s) => s.id === CROWD_HIGH)?.status).toBe("paused");
        });

        it("rejects the status the subscription already has, using the cached list", async () => {
            await loadSubscriptions();
            const setStatus = vi.spyOn(subAdapters.subscriptions!, "setStatus");

            expect(await subCommands.subscriptions.setStatus(CROWD_HIGH, "active")).toEqual({
                ok: false,
                reason: "status-unchanged",
            });
            expect(setStatus).not.toHaveBeenCalled();
        });

        it("rejects an id missing from the cached list", async () => {
            await loadSubscriptions();

            expect(await subCommands.subscriptions.setStatus("urn:unknown", "paused")).toEqual({
                ok: false,
                reason: "subscription-not-found",
            });
        });

        it("calls the adapter when the list is not loaded, and reports its failure", async () => {
            const result = await subCommands.subscriptions.setStatus("urn:unknown", "paused");

            expect(result).toEqual({ ok: false, reason: "request-failed", error: expect.any(MockAdapterError) });
        });
    });

    describe("remove", () => {
        it("removes the subscription and invalidates subscriptions and notifications", async () => {
            await Promise.all([loadSubscriptions(), loadNotifications()]);

            expect(await subCommands.subscriptions.remove(CROWD_HIGH)).toEqual({ ok: true });
            expect(isInvalidated(ngsiKeys.subscriptions(BROKER))).toBe(true);
            expect(isInvalidated(ngsiKeys.notifications(BROKER, {}))).toBe(true);
            expect((await subAdapters.subscriptions!.list()).map((s) => s.id)).not.toContain(CROWD_HIGH);
        });

        it("rejects an id missing from the cached list without calling the adapter", async () => {
            await loadSubscriptions();
            const remove = vi.spyOn(subAdapters.subscriptions!, "remove");

            expect(await subCommands.subscriptions.remove("urn:unknown")).toEqual({
                ok: false,
                reason: "subscription-not-found",
            });
            expect(remove).not.toHaveBeenCalled();
        });

        it("rejects without a subscriptions adapter", async () => {
            setup(createMockNgsiAdapter(undefined, { capabilities: { subscriptions: false } }));

            expect(await subCommands.subscriptions.remove(CROWD_HIGH)).toEqual({
                ok: false,
                reason: "no-subscriptions-adapter",
            });
        });

        it("takes the subscription out of the cached list at once and back if removing fails", async () => {
            setup(createMockNgsiAdapter(undefined, { latencyMs: 200, failOn: ["subscriptions.remove"] }));
            await loadSubscriptions();
            const cachedIds = () =>
                queryClient.getQueryData<{ id: string }[]>(ngsiKeys.subscriptions(BROKER))?.map((s) => s.id);

            const pending = subCommands.subscriptions.remove(CROWD_HIGH);
            await vi.waitFor(() => expect(cachedIds()).not.toContain(CROWD_HIGH), { interval: 5 });
            expect(await pending).toMatchObject({ ok: false, reason: "request-failed" });
            expect(cachedIds()).toContain(CROWD_HIGH);
        });
    });

    describe("refresh", () => {
        beforeEach(() => Promise.all([loadSubscriptions(), loadNotifications(), loadTypes()]));

        it("invalidates only the subscription list", () => {
            subCommands.refresh("subscriptions");

            expect(isInvalidated(ngsiKeys.subscriptions(BROKER))).toBe(true);
            expect(isInvalidated(ngsiKeys.notifications(BROKER, {}))).toBe(false);
            expect(isInvalidated(ngsiKeys.types(BROKER))).toBe(false);
        });

        it("invalidates only the notification lists", () => {
            subCommands.refresh("notifications");

            expect(isInvalidated(ngsiKeys.notifications(BROKER, {}))).toBe(true);
            expect(isInvalidated(ngsiKeys.subscriptions(BROKER))).toBe(false);
        });
    });
});

describe("saved query commands", () => {
    const SAVED = fixtureSavedQueries[0];
    let sqAdapters: NgsiAdapters;
    let sqCommands: NgsiCommands;

    const setup = (adapterSet: NgsiAdapters) => {
        sqAdapters = adapterSet;
        sqCommands = createCommands(store, queryClient, BROKER, sqAdapters);
    };
    const loadSaved = () =>
        queryClient.fetchQuery({
            queryKey: ngsiKeys.savedQueries(BROKER),
            queryFn: () => sqAdapters.savedQueries!.list(),
        });
    const isInvalidated = (queryKey: readonly unknown[]) => queryClient.getQueryState(queryKey)?.isInvalidated;

    beforeEach(() => setup(createMockNgsiAdapter()));

    it("saves a query, returns it and invalidates the list", async () => {
        await loadSaved();
        const result = await sqCommands.savedQueries.save({ name: "Cameras", query: { types: [fixtureTypes.Camera] } });

        expect(result).toEqual({
            ok: true,
            savedQuery: expect.objectContaining({ name: "Cameras", id: expect.any(String) }),
        });
        expect(isInvalidated(ngsiKeys.savedQueries(BROKER))).toBe(true);
        expect(await sqAdapters.savedQueries!.list()).toHaveLength(fixtureSavedQueries.length + 1);
    });

    it("rejects a blank name without calling the adapter", async () => {
        const save = vi.spyOn(sqAdapters.savedQueries!, "save");
        expect(await sqCommands.savedQueries.save({ name: "  ", query: {} })).toEqual({
            ok: false,
            reason: "blank-name",
        });
        expect(save).not.toHaveBeenCalled();
    });

    it("updates a saved query", async () => {
        await loadSaved();
        const renamed = { ...SAVED, name: "Renamed" };
        expect(await sqCommands.savedQueries.update(renamed)).toEqual({ ok: true, savedQuery: renamed });
        expect((await sqAdapters.savedQueries!.list())[0].name).toBe("Renamed");
    });

    it("rejects updating or removing an id missing from the cached list", async () => {
        await loadSaved();
        expect(await sqCommands.savedQueries.update({ ...SAVED, id: "gone" })).toEqual({
            ok: false,
            reason: "saved-query-not-found",
        });
        expect(await sqCommands.savedQueries.remove("gone")).toEqual({ ok: false, reason: "saved-query-not-found" });
    });

    it("removes a saved query and invalidates the list", async () => {
        await loadSaved();
        expect(await sqCommands.savedQueries.remove(SAVED.id)).toEqual({ ok: true });
        expect(isInvalidated(ngsiKeys.savedQueries(BROKER))).toBe(true);
        expect(await sqAdapters.savedQueries!.list()).toHaveLength(fixtureSavedQueries.length - 1);
    });

    it("takes a removed query out of the cached list before the request ends", async () => {
        setup(createMockNgsiAdapter(undefined, { latencyMs: 20 }));
        await loadSaved();
        const pending = sqCommands.savedQueries.remove(SAVED.id);
        await vi.waitFor(() =>
            expect(
                queryClient.getQueryData<{ id: string }[]>(ngsiKeys.savedQueries(BROKER))?.map((q) => q.id),
            ).not.toContain(SAVED.id),
        );
        expect(await sqCommands.savedQueries.remove(SAVED.id)).toEqual({ ok: false, reason: "saved-query-not-found" });
        expect(await pending).toEqual({ ok: true });
    });

    it("puts the query back when removing fails", async () => {
        setup(createMockNgsiAdapter(undefined, { failOn: ["savedQueries.remove"] }));
        await loadSaved();
        expect(await sqCommands.savedQueries.remove(SAVED.id)).toMatchObject({ ok: false, reason: "request-failed" });
        expect(queryClient.getQueryData<{ id: string }[]>(ngsiKeys.savedQueries(BROKER))?.map((q) => q.id)).toContain(
            SAVED.id,
        );
    });

    it("turns an adapter failure into request-failed", async () => {
        setup(createMockNgsiAdapter(undefined, { failOn: ["savedQueries.save"] }));
        const result = await sqCommands.savedQueries.save({ name: "X", query: {} });
        expect(result).toMatchObject({ ok: false, reason: "request-failed", error: expect.any(MockAdapterError) });
    });

    it("rejects every command without a saved query store", async () => {
        setup(createMockNgsiAdapter(undefined, { capabilities: { savedQueries: false } }));
        const reason = "no-saved-queries-adapter";
        expect(await sqCommands.savedQueries.save({ name: "X", query: {} })).toEqual({ ok: false, reason });
        expect(await sqCommands.savedQueries.update(SAVED)).toEqual({ ok: false, reason });
        expect(await sqCommands.savedQueries.remove(SAVED.id)).toEqual({ ok: false, reason });
    });

    it("refresh invalidates only the saved queries", async () => {
        await Promise.all([loadSaved(), loadTypes()]);
        sqCommands.refresh("savedQueries");
        expect(isInvalidated(ngsiKeys.savedQueries(BROKER))).toBe(true);
        expect(isInvalidated(ngsiKeys.types(BROKER))).toBe(false);
    });
});
