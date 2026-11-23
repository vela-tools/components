import type { NotificationRecord } from "../../../utils/subscriptions.types";
import { shortEntityId } from "../../../utils/subscriptions";

export function subscriptionLabel(notification: NotificationRecord, names?: Record<string, string>): string {
    return names?.[notification.subscriptionId] ?? shortEntityId(notification.subscriptionId);
}
