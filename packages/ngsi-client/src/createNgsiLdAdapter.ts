import type { NgsiAdapters } from "@vela-tools/ngsi";
import type { NgsiLdClientConfig } from "./config";
import { createEntitySource } from "./entities";
import { createHttp } from "./http";
import { createNotificationSource } from "./notifications";
import { createLiveSource } from "./live";
import { createSavedQueryStore } from "./savedQueries";
import { createSubscriptionStore } from "./subscriptions";
import { createTemporalSource } from "./temporal";

export type NgsiLdAdapterOptions = NgsiLdClientConfig & {
    features?: {
        subscriptions?: boolean;
        notifications?: boolean;
        savedQueries?: boolean;
        temporal?: boolean;
        live?: boolean;
    };
};

export function createNgsiLdAdapter(options: NgsiLdAdapterOptions): NgsiAdapters {
    const { features = {}, ...config } = options;
    const http = createHttp(config);
    const entities = createEntitySource(http, config);
    return {
        entities,
        ...(features.subscriptions !== false && { subscriptions: createSubscriptionStore(http, config) }),
        ...(features.notifications !== false && { notifications: createNotificationSource(http, config) }),
        ...(features.savedQueries === true && { savedQueries: createSavedQueryStore(http, config) }),
        ...(features.temporal === true && { temporal: createTemporalSource(http, config) }),
        ...(features.live === true && { live: createLiveSource(entities, config) }),
    };
}
