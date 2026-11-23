import { useMemo, useState } from "react";
import type { QueryBuilderDraft, QueryBuilderSavedItem, QueryBuilderType } from "@vela-tools/ui";
import { useActiveQuery } from "../../hooks/useActiveQuery";
import { useCapabilities, useNgsiCommands } from "../../hooks/useNgsi";
import { useSavedQueries } from "../../hooks/useSavedQueries";
import type { RequestFailed } from "../../runtime/commands";
import type { EntityQuery, SavedQuery } from "../../types";
import { errorMessage } from "../errorMessage";
import { followActiveQuery, queryToDraft, toSavedItem } from "./draft";
import { useQueryDraft } from "./useQueryDraft";

type UseQueryBuilderOptions = {
    onQueryRun?: (query: EntityQuery) => void;
    defaultQuery?: EntityQuery;
};

type QueryBuilderState = {
    types: QueryBuilderType[];
    typesLoading?: boolean;
    value: QueryBuilderDraft;
    onChange: (draft: QueryBuilderDraft) => void;
    preview: string;
    error?: string | null;
    busy?: boolean;
    onRun: () => void;
    onNew: () => void;
    savedQueries?: QueryBuilderSavedItem[];
    loadedId?: string | null;
    onLoad?: (id: string) => void;
    onRunSaved?: (id: string) => void;
    onSave?: (name: string) => void;
    onUpdate?: () => void;
    onDelete?: (id: string) => void;
};

const MESSAGES: Record<string, string> = {
    "unknown-type": "One of the selected types is not on this broker.",
    "empty-q": "The q part of the query is empty.",
    "invalid-geo": "The geo region needs valid coordinates and a radius above 0.",
    "invalid-paging": "limit and offset must be whole numbers, 0 or more.",
    "blank-name": "Give the query a name.",
    "saved-query-not-found": "That saved query no longer exists.",
    "no-saved-queries-adapter": "Saved queries are not supported by this broker.",
};

const NO_SAVED: SavedQuery[] = [];

function messageOf(result: { reason: string } | RequestFailed): string {
    if (result.reason === "request-failed" && "error" in result) {
        return errorMessage(result.error);
    }
    return MESSAGES[result.reason] ?? result.reason;
}

export function useQueryBuilder({ onQueryRun, defaultQuery }: UseQueryBuilderOptions = {}): QueryBuilderState {
    const commands = useNgsiCommands();
    const capabilities = useCapabilities();
    const savedQuery = useSavedQueries();
    const active = useActiveQuery();
    const { draft, setDraft, types, typesLoading, typesError, preview, reset, toQuery } = useQueryDraft({
        initialQuery: defaultQuery ?? active,
    });

    const [loadedId, setLoadedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(0);
    const [seenActive, setSeenActive] = useState(active);
    const [ranQuery, setRanQuery] = useState<EntityQuery | null>(null);

    if (seenActive !== active) {
        setSeenActive(active);
        if (active !== ranQuery) setDraft((d) => followActiveQuery(d, active));
    }

    const saved = savedQuery.data ?? NO_SAVED;
    const savedItems = useMemo(() => saved.map(toSavedItem), [saved]);

    const savedError = savedQuery.error;
    const savedQueriesOn = capabilities.savedQueries;

    return useMemo<QueryBuilderState>(() => {
        const apply = (query: EntityQuery) => {
            setRanQuery(query);
            const result = commands.setQuery(query);
            if (!result.ok) {
                setError(messageOf(result));
                return;
            }
            setError(null);
            onQueryRun?.(query);
        };

        const withPending = async (work: () => Promise<void>) => {
            setPending((n) => n + 1);
            try {
                await work();
            } finally {
                setPending((n) => n - 1);
            }
        };

        const currentQuery = (): EntityQuery | null => {
            const result = toQuery();
            if (result.ok) return result.query;
            setError(result.error);
            return null;
        };

        const findSaved = (id: string) => saved.find((s) => s.id === id);

        const state: QueryBuilderState = {
            types,
            typesLoading,
            value: draft,
            onChange: (next) => {
                setDraft(next);
                setError(null);
            },
            preview,
            error: error ?? (typesError ? errorMessage(typesError) : savedError ? errorMessage(savedError) : null),
            busy: pending > 0,
            onRun: () => {
                const query = currentQuery();
                if (query) apply(query);
            },
            onNew: () => {
                reset();
                setLoadedId(null);
                setError(null);
            },
        };

        if (!savedQueriesOn) return state;

        return {
            ...state,
            savedQueries: savedItems,
            loadedId,
            onLoad: (id) => {
                const item = findSaved(id);
                if (!item) return;
                setDraft(queryToDraft(item.query));
                setLoadedId(id);
                setError(null);
            },
            onRunSaved: (id) => {
                const item = findSaved(id);
                if (!item) return;
                setDraft(queryToDraft(item.query));
                setLoadedId(id);
                apply(item.query);
            },
            onSave: (name) => {
                const query = currentQuery();
                if (!query) return;
                void withPending(async () => {
                    const result = await commands.savedQueries.save({ name, query });
                    if (!result.ok) return setError(messageOf(result));
                    setError(null);
                    setLoadedId(result.savedQuery.id);
                });
            },
            onUpdate: () => {
                const item = loadedId ? findSaved(loadedId) : undefined;
                const query = currentQuery();
                if (!item || !query) return;
                void withPending(async () => {
                    const result = await commands.savedQueries.update({ ...item, query });
                    setError(result.ok ? null : messageOf(result));
                });
            },
            onDelete: (id) => {
                void withPending(async () => {
                    const result = await commands.savedQueries.remove(id);
                    if (!result.ok) return setError(messageOf(result));
                    setError(null);
                    setLoadedId((current) => (current === id ? null : current));
                });
            },
        };
    }, [
        commands,
        onQueryRun,
        draft,
        setDraft,
        loadedId,
        error,
        pending,
        types,
        typesLoading,
        typesError,
        savedError,
        toQuery,
        reset,
        saved,
        savedItems,
        preview,
        savedQueriesOn,
    ]);
}
