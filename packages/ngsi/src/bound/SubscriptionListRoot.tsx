import { useCallback, useMemo, useState, type ReactNode } from "react";
import { SubscriptionListProvider, type SubscriptionListContextValue, type SubscriptionRecord } from "@vela-tools/ui";
import { useNgsiCommands } from "../hooks/useNgsi";
import { useSubscriptions } from "../hooks/useSubscriptions";
import type { Subscription, SubscriptionStatusChange } from "../types";
import { errorMessage } from "./errorMessage";

export type SubscriptionListRootProps = {
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    selectable?: boolean;
    onEdit?: (subscription: Subscription) => void;
    emptyText?: ReactNode;
    children: ReactNode;
};

type ActionResult = { ok: true } | { ok: false; reason: string; error?: unknown };

const NO_SUBSCRIPTIONS: Subscription[] = [];

const ACTION_MESSAGES: Record<string, string> = {
    "no-subscriptions-adapter": "Subscriptions are not supported by this broker.",
    "subscription-not-found": "This subscription no longer exists on the broker.",
    "subscription-expired": "This subscription has expired. Edit it to set a new expiry date.",
    "status-unchanged": "The subscription already has this status.",
};

const actionMessage = (result: Extract<ActionResult, { ok: false }>) =>
    result.reason === "request-failed"
        ? errorMessage(result.error)
        : (ACTION_MESSAGES[result.reason] ?? "The action could not be done.");

const toRecord = ({ types, unreadable, selectors, ...subscription }: Subscription): SubscriptionRecord => ({
    ...subscription,
    types: types.map((t) => t.type),
    ...(unreadable?.length ? { unreadable: unreadable.map((u) => u.member) } : {}),
    ...(selectors?.length ? { idSelectors: true } : {}),
});

export function SubscriptionListRoot({
    selectedId: controlledId,
    onSelect,
    selectable = true,
    onEdit,
    emptyText,
    children,
}: SubscriptionListRootProps) {
    const commands = useNgsiCommands().subscriptions;
    const query = useSubscriptions();
    const [localId, setLocalId] = useState<string | null>(null);
    const [pendingIds, setPendingIds] = useState<string[]>([]);
    const [actionError, setActionError] = useState<string | null>(null);

    const selectedId = controlledId !== undefined ? controlledId : localId;
    const data = query.data ?? NO_SUBSCRIPTIONS;
    const records = useMemo(() => data.map(toRecord), [data]);

    const setSelected = useCallback(
        (id: string | null) => {
            if (controlledId === undefined) setLocalId(id);
            onSelect?.(id);
        },
        [controlledId, onSelect],
    );

    const select = useCallback(
        (subscription: SubscriptionRecord) => setSelected(subscription.id === selectedId ? null : subscription.id),
        [selectedId, setSelected],
    );

    const runAction = useCallback(async (id: string, action: () => Promise<ActionResult>) => {
        setActionError(null);
        setPendingIds((ids) => [...ids, id]);
        const result = await action();
        setPendingIds((ids) => ids.filter((x) => x !== id));
        if (!result.ok) setActionError(actionMessage(result));
        return result.ok;
    }, []);

    const toggleStatus = useCallback(
        (subscription: SubscriptionRecord, status: SubscriptionStatusChange) =>
            void runAction(subscription.id, () => commands.setStatus(subscription.id, status)),
        [runAction, commands],
    );

    const remove = useCallback(
        (subscription: SubscriptionRecord) =>
            void runAction(subscription.id, () => commands.remove(subscription.id)).then((removed) => {
                if (removed && subscription.id === selectedId) setSelected(null);
            }),
        [runAction, commands, selectedId, setSelected],
    );

    const edit = useMemo(
        () =>
            onEdit
                ? (record: SubscriptionRecord) => {
                      const subscription = data.find((s) => s.id === record.id);
                      if (subscription) onEdit(subscription);
                  }
                : undefined,
        [onEdit, data],
    );

    const value = useMemo<SubscriptionListContextValue>(
        () => ({
            subscriptions: records,
            selectedId,
            select: selectable ? select : undefined,
            toggleStatus,
            remove,
            edit,
            pendingIds,
            stale: query.isFetching && query.isSuccess,
            error: actionError ?? (query.error ? errorMessage(query.error) : null),
            emptyText: query.isPending ? "Loading…" : (emptyText ?? "No subscriptions"),
        }),
        [
            records,
            query.isFetching,
            query.isSuccess,
            query.isPending,
            query.error,
            selectedId,
            selectable,
            select,
            toggleStatus,
            remove,
            edit,
            pendingIds,
            actionError,
            emptyText,
        ],
    );

    return <SubscriptionListProvider value={value}>{children}</SubscriptionListProvider>;
}
