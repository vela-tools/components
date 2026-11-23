import { hashKey, type QueryClient } from "@tanstack/react-query";
import type { NgsiAdapters, SubscriptionStore } from "../adapters";
import type {
    EntityQuery,
    EntityTypeInfo,
    EntityTypeRef,
    GeoFilter,
    NgsiLdEntity,
    SavedQuery,
    Subscription,
    SubscriptionDraft,
    SubscriptionPatch,
    SubscriptionStatusChange,
} from "../types";
import { capabilitiesOf } from "./capabilities";
import {
    createSubscriptionDisabled,
    draftIssues,
    removeSavedQueryDisabled,
    saveQueryDisabled,
    updateSavedQueryDisabled,
    entityMatchesTypes,
    removeSubscriptionDisabled,
    sameTypeRef,
    selectAttributeDisabled,
    selectTypesDisabled,
    setGeoFilterDisabled,
    setQueryDisabled,
    setSubscriptionStatusDisabled,
    updateIssues,
    updateSubscriptionDisabled,
    type CreateSubscriptionRejection,
    type DraftIssue,
    type RemoveSavedQueryRejection,
    type RemoveSubscriptionRejection,
    type SaveQueryRejection,
    type UpdateSavedQueryRejection,
    type SelectAttributeRejection,
    type SelectTypesRejection,
    type SetGeoFilterRejection,
    type SetQueryRejection,
    type SetSubscriptionStatusRejection,
    type UpdateSubscriptionRejection,
} from "./predicates";
import { ngsiKeys } from "./queryKeys";
import { applySubscriptionPatch, isEmptyPatch, revivesExpired } from "./subscriptionPatch";
import type { SelectionState, SelectionStore } from "./store";

export type CommandResult<Reason extends string = never> = { ok: true } | { ok: false; reason: Reason };

export type RequestFailed = { ok: false; reason: "request-failed"; error: unknown };

export type InvalidDraft = { ok: false; reason: "invalid-draft"; issues: DraftIssue[] };

export type UpdateFailed = RequestFailed & { subscription?: Subscription | null };

export type AsyncCommandResult<Reason extends string, Data = object, Failure = never> = Promise<
    ({ ok: true } & Data) | { ok: false; reason: Reason } | RequestFailed | Failure
>;

export type RefreshScope =
    "types" | "entities" | "subscriptions" | "notifications" | "savedQueries" | { entityId: string };

export type SubscriptionCommands = {
    create(
        draft: SubscriptionDraft,
    ): AsyncCommandResult<
        Exclude<CreateSubscriptionRejection, "invalid-draft">,
        { subscription: Subscription },
        InvalidDraft
    >;
    update(
        id: string,
        patch: SubscriptionPatch,
    ): AsyncCommandResult<
        Exclude<UpdateSubscriptionRejection, "invalid-draft">,
        { subscription: Subscription },
        InvalidDraft | UpdateFailed
    >;
    setStatus(id: string, status: SubscriptionStatusChange): AsyncCommandResult<SetSubscriptionStatusRejection>;
    remove(id: string): AsyncCommandResult<RemoveSubscriptionRejection>;
};

export type SavedQueryCommands = {
    save(
        query: Omit<SavedQuery, "id" | "createdAt">,
    ): AsyncCommandResult<SaveQueryRejection, { savedQuery: SavedQuery }>;
    update(query: SavedQuery): AsyncCommandResult<UpdateSavedQueryRejection, { savedQuery: SavedQuery }>;
    remove(id: string): AsyncCommandResult<RemoveSavedQueryRejection>;
};

export type SelectAttributeOptions = { entityId?: string };

export type NgsiCommands = {
    selectTypes(types: EntityTypeRef[]): CommandResult<SelectTypesRejection>;
    selectEntity(id: string | null): CommandResult;
    selectAttribute(name: string | null, options?: SelectAttributeOptions): CommandResult<SelectAttributeRejection>;
    setQuery(query: EntityQuery): CommandResult<SetQueryRejection>;
    setGeoFilter(geo: GeoFilter | null): CommandResult<SetGeoFilterRejection>;
    refresh(scope?: RefreshScope): CommandResult;
    subscriptions: SubscriptionCommands;
    savedQueries: SavedQueryCommands;
};

function sameTypes(a: EntityTypeRef[], b: EntityTypeRef[]) {
    return a.length === b.length && b.every((t) => a.some((u) => sameTypeRef(u, t)));
}

const sameValue = (a: unknown, b: unknown) => hashKey([a]) === hashKey([b]);

export function createCommands(
    store: SelectionStore,
    queryClient: QueryClient,
    brokerId: string,
    adapters: NgsiAdapters,
): NgsiCommands {
    const capabilities = capabilitiesOf(adapters);

    const cachedEntity = (id: string) => queryClient.getQueryData<NgsiLdEntity | null>(ngsiKeys.entity(brokerId, id));

    const withTypes = (s: SelectionState, types: EntityTypeRef[]): SelectionState => {
        const entity = s.entityId ? cachedEntity(s.entityId) : undefined;
        const keepEntity = !!entity && entityMatchesTypes(entity, types);
        return {
            ...s,
            types,
            entityId: keepEntity ? s.entityId : null,
            attribute: keepEntity ? s.attribute : null,
        };
    };

    const cachedSubscriptions = () => queryClient.getQueryData<Subscription[]>(ngsiKeys.subscriptions(brokerId));
    const reread = async (store: SubscriptionStore, id: string): Promise<Subscription | null | undefined> => {
        let current: Subscription | null;
        try {
            current = await store.get(id);
        } catch {
            await invalidate(ngsiKeys.subscriptions(brokerId));
            return undefined;
        }
        const listKey = ngsiKeys.subscriptions(brokerId);
        await queryClient.cancelQueries({ queryKey: listKey });
        queryClient.setQueryData<Subscription[]>(
            listKey,
            (list) =>
                list && (current ? list.map((s) => (s.id === id ? current : s)) : list.filter((s) => s.id !== id)),
        );
        return current;
    };
    const cachedSavedQueries = () => queryClient.getQueryData<SavedQuery[]>(ngsiKeys.savedQueries(brokerId));

    const invalidate = (...keys: readonly (readonly unknown[])[]) =>
        Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

    async function request<Data extends object>(
        run: () => Promise<Data>,
        keys: readonly (readonly unknown[])[],
    ): Promise<({ ok: true } & Data) | RequestFailed> {
        let data: Data;
        try {
            data = await run();
        } catch (error) {
            return { ok: false, reason: "request-failed", error };
        }
        await invalidate(...keys);
        return { ok: true, ...data };
    }

    async function removeFromList<Item extends { id: string }>(
        listKey: readonly unknown[],
        id: string,
        run: () => Promise<void>,
        keys: readonly (readonly unknown[])[],
    ): Promise<{ ok: true } | RequestFailed> {
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData<Item[]>(listKey);
        if (previous)
            queryClient.setQueryData<Item[]>(
                listKey,
                previous.filter((item) => item.id !== id),
            );
        const result = await request(async () => {
            await run();
            return {};
        }, keys);
        if (!result.ok && previous) queryClient.setQueryData<Item[]>(listKey, previous);
        return result;
    }

    return {
        selectTypes(types) {
            const knownTypes = queryClient.getQueryData<EntityTypeInfo[]>(ngsiKeys.types(brokerId));
            const reason = selectTypesDisabled(knownTypes, types);
            if (reason) return { ok: false, reason };

            store.setState((s) =>
                sameTypes(s.types, types) ? s : { ...withTypes(s, types), query: { ...s.query, types } },
            );
            return { ok: true };
        },

        setQuery(query) {
            const knownTypes = queryClient.getQueryData<EntityTypeInfo[]>(ngsiKeys.types(brokerId));
            const reason = setQueryDisabled(knownTypes, query);
            if (reason) return { ok: false, reason };

            if (sameValue(store.getState().query, query)) {
                void invalidate(ngsiKeys.entityLists(brokerId));
                return { ok: true };
            }
            store.setState((s) => {
                const types = query.types ?? [];
                return { ...(sameTypes(s.types, types) ? s : withTypes(s, types)), query };
            });
            return { ok: true };
        },

        setGeoFilter(geo) {
            if (geo) {
                const reason = setGeoFilterDisabled(geo);
                if (reason) return { ok: false, reason };
            }
            store.setState((s) => {
                if (sameValue(s.query.geo ?? null, geo)) return s;
                const { geo: _previous, ...rest } = s.query;
                return { ...s, query: geo ? { ...rest, geo } : rest };
            });
            return { ok: true };
        },

        selectEntity(id) {
            store.setState((s) => (s.entityId === id ? s : { ...s, entityId: id, attribute: null }));
            return { ok: true };
        },

        selectAttribute(name, options) {
            const s = store.getState();
            const entityId = options?.entityId ?? s.entityId;
            if (name !== null) {
                const entity = entityId ? cachedEntity(entityId) : undefined;
                const reason = selectAttributeDisabled(s, entity, name, entityId);
                if (reason) return { ok: false, reason };
            }
            store.setState((s) =>
                s.entityId === entityId && s.attribute === name ? s : { ...s, entityId, attribute: name },
            );
            return { ok: true };
        },

        refresh(scope) {
            const keys =
                scope === undefined
                    ? [ngsiKeys.all(brokerId)]
                    : scope === "types"
                      ? [ngsiKeys.types(brokerId)]
                      : scope === "entities"
                        ? [ngsiKeys.entityLists(brokerId), ngsiKeys.entityById(brokerId)]
                        : scope === "subscriptions"
                          ? [ngsiKeys.subscriptions(brokerId)]
                          : scope === "notifications"
                            ? [ngsiKeys.notificationLists(brokerId)]
                            : scope === "savedQueries"
                              ? [ngsiKeys.savedQueries(brokerId)]
                              : [ngsiKeys.entity(brokerId, scope.entityId)];
            void invalidate(...keys);
            return { ok: true };
        },

        subscriptions: {
            async create(draft) {
                const knownTypes = queryClient.getQueryData<EntityTypeInfo[]>(ngsiKeys.types(brokerId));
                const reason = createSubscriptionDisabled(capabilities, draft, knownTypes);
                if (reason === "invalid-draft") return { ok: false, reason, issues: draftIssues(draft, knownTypes) };
                if (reason) return { ok: false, reason };
                const subscriptionStore = adapters.subscriptions;
                if (!subscriptionStore) return { ok: false, reason: "no-subscriptions-adapter" };
                return request(
                    async () => ({ subscription: await subscriptionStore.create(draft) }),
                    [ngsiKeys.subscriptions(brokerId)],
                );
            },

            async update(id, patch) {
                const subscriptionStore = adapters.subscriptions;
                if (!capabilities.subscriptions || !subscriptionStore)
                    return { ok: false, reason: "no-subscriptions-adapter" };
                let original = cachedSubscriptions()?.find((s) => s.id === id) ?? null;
                if (!original) {
                    try {
                        original = await subscriptionStore.get(id);
                    } catch (error) {
                        return { ok: false, reason: "request-failed", error };
                    }
                }
                const knownTypes = queryClient.getQueryData<EntityTypeInfo[]>(ngsiKeys.types(brokerId));
                const reason = updateSubscriptionDisabled(capabilities, original, patch, knownTypes);
                if (!original) return { ok: false, reason: "subscription-not-found" };
                if (reason === "invalid-draft")
                    return { ok: false, reason, issues: updateIssues(original, patch, knownTypes) };
                if (reason) return { ok: false, reason };
                const sent = revivesExpired(original, patch) ? { ...patch, status: "active" as const } : patch;
                const subscription = applySubscriptionPatch(original, sent);
                if (isEmptyPatch(patch)) return { ok: true, subscription };
                const result = await request(async () => {
                    await subscriptionStore.update(id, sent);
                    return { subscription };
                }, [ngsiKeys.subscriptions(brokerId)]);
                if (result.ok) return result;
                return { ...result, subscription: await reread(subscriptionStore, id) };
            },

            async setStatus(id, status) {
                const reason = setSubscriptionStatusDisabled(capabilities, cachedSubscriptions(), id, status);
                if (reason) return { ok: false, reason };
                const subscriptionStore = adapters.subscriptions;
                if (!subscriptionStore) return { ok: false, reason: "no-subscriptions-adapter" };
                return request(async () => {
                    await subscriptionStore.setStatus(id, status);
                    return {};
                }, [ngsiKeys.subscriptions(brokerId)]);
            },

            async remove(id) {
                const reason = removeSubscriptionDisabled(capabilities, cachedSubscriptions(), id);
                if (reason) return { ok: false, reason };
                const subscriptionStore = adapters.subscriptions;
                if (!subscriptionStore) return { ok: false, reason: "no-subscriptions-adapter" };
                return removeFromList<Subscription>(
                    ngsiKeys.subscriptions(brokerId),
                    id,
                    () => subscriptionStore.remove(id),
                    [ngsiKeys.subscriptions(brokerId), ngsiKeys.notificationLists(brokerId)],
                );
            },
        },

        savedQueries: {
            async save(query) {
                const reason = saveQueryDisabled(capabilities, query);
                if (reason) return { ok: false, reason };
                const savedQueryStore = adapters.savedQueries;
                if (!savedQueryStore) return { ok: false, reason: "no-saved-queries-adapter" };
                return request(
                    async () => ({ savedQuery: await savedQueryStore.save(query) }),
                    [ngsiKeys.savedQueries(brokerId)],
                );
            },

            async update(query) {
                const reason = updateSavedQueryDisabled(capabilities, cachedSavedQueries(), query);
                if (reason) return { ok: false, reason };
                const savedQueryStore = adapters.savedQueries;
                if (!savedQueryStore) return { ok: false, reason: "no-saved-queries-adapter" };
                return request(
                    async () => ({ savedQuery: await savedQueryStore.update(query) }),
                    [ngsiKeys.savedQueries(brokerId)],
                );
            },

            async remove(id) {
                const reason = removeSavedQueryDisabled(capabilities, cachedSavedQueries(), id);
                if (reason) return { ok: false, reason };
                const savedQueryStore = adapters.savedQueries;
                if (!savedQueryStore) return { ok: false, reason: "no-saved-queries-adapter" };
                return removeFromList<SavedQuery>(
                    ngsiKeys.savedQueries(brokerId),
                    id,
                    () => savedQueryStore.remove(id),
                    [ngsiKeys.savedQueries(brokerId)],
                );
            },
        },
    };
}
