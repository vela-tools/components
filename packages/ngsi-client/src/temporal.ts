import type { TemporalSource } from "@vela-tools/ngsi";
import type { NgsiLdClientConfig } from "./config";
import { CORE_CONTEXT, NgsiValidationError } from "./entities";
import type { Http } from "./http";
import { contextFromLink } from "./iri";
import { entitySchema, reasonOf } from "./schemas";
import { createSegmentGetter } from "./segments";

export function createTemporalSource(http: Http, config: NgsiLdClientConfig): TemporalSource {
    const getBySegment = createSegmentGetter(http);
    return {
        async history(query, opts) {
            const { body, headers } = await getBySegment("/temporal/entities", query.entityId, {
                signal: opts?.signal,
                query: {
                    attrs: query.attrs.length ? query.attrs.join(",") : undefined,
                    timerel: "between",
                    timeAt: query.from,
                    endTimeAt: query.to,
                    lastN: query.lastN,
                },
            });
            const r = entitySchema.safeParse(body);
            if (!r.success)
                throw new NgsiValidationError(
                    `The temporal data of ${query.entityId} from the broker can't be read: ${reasonOf(r.error)}`,
                    body,
                );
            return { ...r.data, "@context": config.context ?? contextFromLink(headers.get("link")) ?? CORE_CONTEXT };
        },
    };
}
