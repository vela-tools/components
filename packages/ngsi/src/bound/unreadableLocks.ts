import type { QueryBuilderLocks, SubscriptionEditorField } from "@vela-tools/ui";
import { SELECTORS_LOCKED } from "../runtime/predicates";
import type { Subscription, SubscriptionUnreadable } from "../types";

type UnreadableLocks = {
    editor?: Partial<Record<SubscriptionEditorField, string>>;
    query?: QueryBuilderLocks;
};

const reason = (members: string[]) =>
    `The broker has a value for ${members.join(", ")} that can't be read, so it can't be changed here. Delete the subscription and create it again.`;

export function unreadableLocks(subscription: Subscription | undefined): UnreadableLocks {
    const byField = new Map<SubscriptionUnreadable["field"], string[]>();
    for (const { member, field } of subscription?.unreadable ?? [])
        byField.set(field, [...(byField.get(field) ?? []), member]);
    const hasSelectors = !!subscription?.selectors?.length;
    if (!byField.size && !hasSelectors) return {};
    const editor: Partial<Record<SubscriptionEditorField, string>> = {};
    const query: QueryBuilderLocks = hasSelectors ? { types: SELECTORS_LOCKED } : {};
    for (const [field, members] of byField) {
        if (field === "types") query.types = [query.types, reason(members)].filter(Boolean).join(" ");
        else if (field === "q") query.conditions = reason(members);
        else if (field === "geo") query.geo = reason(members);
        else if (field !== "status" && field !== "delivery") editor[field] = reason(members);
    }
    return { editor, query };
}
