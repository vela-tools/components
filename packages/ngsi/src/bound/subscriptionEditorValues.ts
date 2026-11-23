import type { SubscriptionEditorNotify, SubscriptionEditorPayload, SubscriptionEditorValues } from "@vela-tools/ui";
import type { NotificationPayload, SubscriptionDraft, SubscriptionNotify } from "../types";

type EditorDraftMembers = Omit<SubscriptionDraft, "types" | "q" | "geo">;

function editorNotify(notify: SubscriptionNotify | undefined): SubscriptionEditorNotify {
    if (notify?.kind === "every") return { kind: "every", triggers: [], seconds: notify.seconds };
    return { kind: "onChange", triggers: notify?.triggers ?? [], throttling: notify?.throttling };
}

function draftNotify(notify: SubscriptionEditorNotify): SubscriptionNotify | undefined {
    if (notify.kind === "every") return { kind: "every", seconds: notify.seconds ?? 0 };
    if (!notify.triggers.length && notify.throttling === undefined) return undefined;
    return {
        kind: "onChange",
        ...(notify.triggers.length ? { triggers: notify.triggers } : {}),
        ...(notify.throttling !== undefined ? { throttling: notify.throttling } : {}),
    };
}

function editorPayload(payload: NotificationPayload | undefined, existing: boolean): SubscriptionEditorPayload {
    return {
        format: payload?.format ?? (existing ? "normalized" : "keyValues"),
        pick: payload?.pick ?? [],
        omit: payload?.omit ?? [],
        showChanges: payload?.showChanges ?? false,
        sysAttrs: payload?.sysAttrs ?? false,
        join: payload?.join ?? "",
        ...(payload?.joinLevel !== undefined ? { joinLevel: payload.joinLevel } : {}),
    };
}

const named = (names: string[]) => names.map((name) => name.trim()).filter(Boolean);

function draftPayload(payload: SubscriptionEditorPayload): NotificationPayload {
    const pick = named(payload.pick);
    const omit = named(payload.omit);
    return {
        format: payload.format,
        ...(pick.length ? { pick } : {}),
        ...(omit.length ? { omit } : {}),
        ...(payload.showChanges ? { showChanges: true } : {}),
        ...(payload.sysAttrs ? { sysAttrs: true } : {}),
        ...(payload.join ? { join: payload.join } : {}),
        ...(payload.join && payload.joinLevel !== undefined ? { joinLevel: payload.joinLevel } : {}),
    };
}

export function toEditorValues(
    defaults: Partial<SubscriptionDraft> | undefined,
    attribute: string | null,
    existing = false,
): SubscriptionEditorValues {
    return {
        name: defaults?.name ?? "",
        description: defaults?.description ?? "",
        watchedAttributes: defaults?.watchedAttributes ?? (attribute ? [attribute] : []),
        notify: editorNotify(defaults?.notify),
        expiresAt: defaults?.expiresAt ?? "",
        scopeQ: defaults?.scopeQ ?? "",
        lang: defaults?.lang ?? "",
        payload: editorPayload(defaults?.payload, existing),
        jsonldContext: defaults?.jsonldContext ?? "",
        expandValues: defaults?.expandValues ?? [],
        jsonKeys: defaults?.jsonKeys ?? [],
        endpoint: defaults?.endpoint?.uri ?? "",
    };
}

export function toDraftMembers(values: SubscriptionEditorValues, conditionAttributes: string[]): EditorDraftMembers {
    const notify = draftNotify(values.notify);
    const description = values.description.trim();
    const scopeQ = values.scopeQ.trim();
    const lang = values.lang.trim();
    const jsonldContext = values.jsonldContext.trim();
    const expandValues = named(values.expandValues);
    const jsonKeys = named(values.jsonKeys);
    const endpoint = values.endpoint.trim();
    const watchedAttributes =
        values.notify.kind === "every"
            ? []
            : values.watchedAttributes.length
              ? values.watchedAttributes
              : conditionAttributes;
    return {
        name: values.name.trim(),
        ...(description ? { description } : {}),
        watchedAttributes,
        ...(notify ? { notify } : {}),
        ...(values.expiresAt ? { expiresAt: values.expiresAt } : {}),
        ...(scopeQ ? { scopeQ } : {}),
        ...(lang ? { lang } : {}),
        payload: draftPayload(values.payload),
        ...(jsonldContext ? { jsonldContext } : {}),
        ...(expandValues.length ? { expandValues } : {}),
        ...(jsonKeys.length ? { jsonKeys } : {}),
        ...(endpoint ? { endpoint: { uri: endpoint } } : {}),
    };
}
