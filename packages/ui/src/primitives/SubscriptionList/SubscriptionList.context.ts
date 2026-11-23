import type { ReactNode } from "react";
import type { SubscriptionRecord, SubscriptionStatus } from "../../utils/subscriptions.types";
import { createItemContext } from "../createItemContext";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type SubscriptionListContextValue = {
    subscriptions: SubscriptionRecord[];
    selectedId: string | null;
    select?: (subscription: SubscriptionRecord) => void;
    toggleStatus?: (subscription: SubscriptionRecord, status: Exclude<SubscriptionStatus, "expired">) => void;
    remove?: (subscription: SubscriptionRecord) => void;
    edit?: (subscription: SubscriptionRecord) => void;
    pendingIds: readonly string[];
    stale: boolean;
    error?: ReactNode;
    emptyText?: ReactNode;
};

export const [SubscriptionListProvider, useSubscriptionListContext] =
    createPrimitiveContext<SubscriptionListContextValue>("SubscriptionList");

export const [SubscriptionListItemProvider, useSubscriptionListItem] = createItemContext<SubscriptionRecord>(
    "SubscriptionList",
    "SubscriptionList.Table or SubscriptionList.Rows",
);
