import type { Notification, NotificationSource } from "@vela-tools/ngsi";
import type { NgsiLdClientConfig } from "./config";
import type { Http } from "./http";
import { propertyValue } from "./iri";
import { allPages, truncatedReason } from "./pages";
import { entitySchema, reasonOf } from "./schemas";

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

const quoted = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function toNotification(e: Record<string, unknown> & { id: string }): Notification {
    return {
        id: e.id,
        subscriptionId: str(propertyValue(e, "subscriptionId")) ?? "",
        receivedAt: str(propertyValue(e, "timestamp")) ?? "",
        status: propertyValue(e, "status") === "delivered" ? "delivered" : "failed",
        source: str(propertyValue(e, "source")),
        payload: {
            entityId: propertyValue(e, "entity_id"),
            value: propertyValue(e, "value"),
            threshold: propertyValue(e, "threshold"),
        },
    };
}

export function createNotificationSource(http: Http, config: NgsiLdClientConfig): NotificationSource {
    const type = config.notificationEntityType ?? "ScorpioNotification";
    return {
        async list(query, opts) {
            const items = await allPages(http, "/entities", "notification entities", {
                query: {
                    type,
                    q: query.subscriptionId ? `subscriptionId==${quoted(query.subscriptionId)}` : undefined,
                },
                signal: opts?.signal,
                onTruncated: () =>
                    config.onInvalid?.({
                        kind: "notification",
                        value: undefined,
                        reason: truncatedReason("notifications"),
                    }),
            });
            const list = items
                .flatMap((item) => {
                    const r = entitySchema.safeParse(item);
                    if (!r.success) {
                        config.onInvalid?.({ kind: "notification", value: item, reason: reasonOf(r.error) });
                        return [];
                    }
                    return [toNotification(r.data)];
                })
                .filter((n) => !query.subscriptionId || n.subscriptionId === query.subscriptionId)
                .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
            return query.limit === undefined ? list : list.slice(0, query.limit);
        },
    };
}
