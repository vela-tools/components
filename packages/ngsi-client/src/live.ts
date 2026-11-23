import type { EntitySource, LiveSource } from "@vela-tools/ngsi";
import type { NgsiLdClientConfig } from "./config";

const DEFAULT_LIVE_INTERVAL_MS = 10_000;
const MIN_LIVE_INTERVAL_MS = 1_000;

export function createLiveSource(entities: EntitySource, config: NgsiLdClientConfig): LiveSource {
    const interval = Math.max(config.liveIntervalMs ?? DEFAULT_LIVE_INTERVAL_MS, MIN_LIVE_INTERVAL_MS);
    const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

    return {
        watch(query, onChange) {
            let stopped = false;
            let timer: ReturnType<typeof setTimeout> | undefined;
            let controller: AbortController | undefined;
            let last: string | undefined;

            const schedule = () => {
                if (!stopped) timer = setTimeout(tick, interval);
            };

            async function tick() {
                if (stopped) return;
                if (hidden()) return schedule();
                controller = new AbortController();
                try {
                    const { entities: list } = await entities.queryEntities(query, { signal: controller.signal });
                    const snapshot = JSON.stringify(list);
                    if (!stopped && snapshot !== last) {
                        last = snapshot;
                        onChange(list);
                    }
                } catch (e) {
                    if (!stopped) config.onLiveError?.(e);
                }
                schedule();
            }

            void tick();
            return () => {
                stopped = true;
                clearTimeout(timer);
                controller?.abort();
            };
        },
    };
}
