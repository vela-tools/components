import { hashKey } from "@tanstack/react-query";
import type {
    ClearableSubscriptionMember,
    EntityTypeRef,
    NotificationPayload,
    Subscription,
    SubscriptionDraft,
    SubscriptionPatch,
} from "../types";
import { sameTypeRef } from "./predicates";

const CLEARABLE: ClearableSubscriptionMember[] = [
    "name",
    "description",
    "q",
    "geo",
    "scopeQ",
    "notify",
    "expiresAt",
    "lang",
    "payload",
    "jsonldContext",
    "expandValues",
    "jsonKeys",
];

const PATCHED = CLEARABLE.filter((key) => key !== "jsonldContext");

const sameValue = (a: unknown, b: unknown) => hashKey([a]) === hashKey([b]);

const DEFAULT_PAYLOAD: NotificationPayload = { format: "normalized" };

const comparable = (draft: SubscriptionDraft, key: ClearableSubscriptionMember) => {
    const value = draft[key];
    if (key === "payload") return draft.payload ?? DEFAULT_PAYLOAD;
    if (key === "geo" && draft.geo) return { lat: draft.geo.lat, lon: draft.geo.lon, radiusKm: draft.geo.radiusKm };
    return value === "" || (Array.isArray(value) && value.length === 0) ? undefined : value;
};

const sameTypes = (a: EntityTypeRef[], b: EntityTypeRef[]) =>
    a.length === b.length &&
    a.every((t) => b.some((u) => sameTypeRef(t, u))) &&
    b.every((t) => a.some((u) => sameTypeRef(t, u)));

const sameNames = (a: string[], b: string[]) => a.length === b.length && a.every((name) => b.includes(name));

export function isEmptyPatch(patch: SubscriptionPatch): boolean {
    return Object.values(patch).every((value) => value === undefined);
}

export function subscriptionPatch(original: SubscriptionDraft, draft: SubscriptionDraft): SubscriptionPatch {
    const patch: SubscriptionPatch = {};
    if (!sameTypes(original.types, draft.types)) patch.types = draft.types;
    const uri = draft.endpoint?.uri.trim() ?? "";
    if (uri !== (original.endpoint?.uri ?? "")) patch.endpoint = { uri };
    if (!sameNames(original.watchedAttributes, draft.watchedAttributes))
        patch.watchedAttributes = draft.watchedAttributes;
    for (const key of PATCHED) {
        const next = comparable(draft, key);
        if (!sameValue(comparable(original, key), next))
            Object.assign(patch, { [key]: next === undefined ? null : key === "payload" ? next : draft[key] });
    }
    return patch;
}

export function revivesExpired(original: Subscription, patch: SubscriptionPatch, now: number = Date.now()): boolean {
    return original.status === "expired" && !!patch.expiresAt && Date.parse(patch.expiresAt) > now;
}

export function applySubscriptionPatch(
    original: Subscription,
    patch: SubscriptionPatch,
    now: number = Date.now(),
): Subscription {
    const member = (key: ClearableSubscriptionMember) => {
        const value = patch[key] === undefined ? original[key] : patch[key];
        return value === null || value === undefined ? {} : { [key]: value };
    };
    return {
        id: original.id,
        types: patch.types ?? original.types,
        watchedAttributes: patch.watchedAttributes ?? original.watchedAttributes,
        ...CLEARABLE.reduce((members, key) => ({ ...members, ...member(key) }), {}),
        status: patch.status ?? (revivesExpired(original, patch, now) ? "active" : original.status),
        ...(patch.endpoint
            ? { endpoint: { ...original.endpoint, ...patch.endpoint } }
            : original.endpoint
              ? { endpoint: original.endpoint }
              : {}),
        ...(original.delivery ? { delivery: original.delivery } : {}),
        ...(original.unreadable ? { unreadable: original.unreadable } : {}),
        ...(original.selectors ? { selectors: original.selectors } : {}),
    };
}
