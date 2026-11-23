import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { QueryBuilderDraft, QueryBuilderType } from "@vela-tools/ui";
import { useEntityTypes } from "../../hooks/useEntityTypes";
import type { EntityQuery, EntityTypeRef } from "../../types";
import { draftToQuery, emptyDraft, previewOf, queryToDraft, toBuilderTypes, type DraftResult } from "./draft";

export type UseQueryDraftOptions = {
    initialQuery?: EntityQuery;
};

type QueryDraftState = {
    draft: QueryBuilderDraft;
    setDraft: Dispatch<SetStateAction<QueryBuilderDraft>>;
    types: QueryBuilderType[];
    typesLoading: boolean;
    typesError: Error | null;
    knownTypes: EntityTypeRef[];
    preview: string;
    reset: () => void;
    toQuery: () => DraftResult;
};

const NO_TYPES: EntityTypeRef[] = [];

export function useQueryDraft({ initialQuery }: UseQueryDraftOptions = {}): QueryDraftState {
    const typesQuery = useEntityTypes();
    const [draft, setDraft] = useState<QueryBuilderDraft>(() =>
        initialQuery ? queryToDraft(initialQuery) : emptyDraft(),
    );

    const infos = typesQuery.data;
    const types = useMemo(() => toBuilderTypes(infos ?? []), [infos]);
    const knownTypes = useMemo(() => (infos ? infos.map((info) => info.type) : NO_TYPES), [infos]);
    const preview = useMemo(() => previewOf(draft), [draft]);

    const reset = useCallback(() => setDraft(emptyDraft()), []);
    const toQuery = useCallback(() => draftToQuery(draft, knownTypes), [draft, knownTypes]);

    const typesLoading = typesQuery.isPending;
    const typesError = typesQuery.error;

    return useMemo(
        () => ({ draft, setDraft, types, typesLoading, typesError, knownTypes, preview, reset, toQuery }),
        [draft, types, typesLoading, typesError, knownTypes, preview, reset, toQuery],
    );
}
