import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
    DEFAULT_QUERY_OPERATORS,
    QueryBuilderProvider,
    SubscriptionEditorProvider,
    type QueryBuilderContextValue,
    type QueryBuilderGeo,
    type QueryBuilderOperator,
    type SubscriptionEditorContextValue,
    type SubscriptionEditorField,
} from "@vela-tools/ui";
import { useEntityTypes } from "../hooks/useEntityTypes";
import { useNgsiSelector } from "../hooks/useNgsiSelector";
import type { EntityQuery, Subscription, SubscriptionDraft } from "../types";
import { clearConditions, conditionProperties, queryToDraft, typeKey } from "./queryBuilder/draft";
import { useQueryDraft } from "./queryBuilder/useQueryDraft";
import { toDraftMembers, toEditorValues } from "./subscriptionEditorValues";
import { subscriptionPatch } from "../runtime/subscriptionPatch";
import { errorMessage } from "./errorMessage";
import { useSubscriptionEditorState } from "./useSubscriptionEditorState";
import { unreadableLocks } from "./unreadableLocks";

export type SubscriptionEditorRootProps = {
    defaultValues?: Partial<SubscriptionDraft>;
    subscription?: Subscription;
    onCreated?: (subscription: Subscription) => void;
    onUpdated?: (subscription: Subscription) => void;
    onCancel?: () => void;
    submitLabel?: ReactNode;
    operators?: QueryBuilderOperator[];
    presetLocations?: QueryBuilderGeo[];
    onAddPresetLocation?: (location: QueryBuilderGeo) => void;
    children: ReactNode;
};

const NO_PRESETS: QueryBuilderGeo[] = [];

export function SubscriptionEditorRoot({
    defaultValues,
    subscription,
    onCreated,
    onUpdated,
    onCancel,
    submitLabel = subscription ? "Save" : "Create",
    operators = DEFAULT_QUERY_OPERATORS,
    presetLocations = NO_PRESETS,
    onAddPresetLocation,
    children,
}: SubscriptionEditorRootProps) {
    const selectedTypes = useNgsiSelector((s) => s.types);
    const selectedAttribute = useNgsiSelector((s) => s.attribute);
    const typesQuery = useEntityTypes();
    const { state, create, update } = useSubscriptionEditorState();
    const [baseline, setBaseline] = useState(subscription);

    const [initial] = useState(() => {
        const source = subscription ?? defaultValues;
        const types = source?.types ?? selectedTypes;
        const query: EntityQuery = {
            ...(types.length ? { types } : {}),
            ...(source?.q ? { q: source.q } : {}),
            ...(source?.geo ? { geo: source.geo } : {}),
        };
        return { query, values: toEditorValues(source, subscription ? null : selectedAttribute, !!subscription) };
    });

    const query = useQueryDraft({ initialQuery: initial.query });
    const [values, setValues] = useState(initial.values);
    const [queryError, setQueryError] = useState<string | null>(null);

    const setField = useCallback<SubscriptionEditorContextValue["setField"]>(
        (field, value) => setValues((v) => ({ ...v, [field]: value })),
        [],
    );

    const infos = typesQuery.data;
    const typeKeys = query.draft.typeKeys;
    const availableAttributes = useMemo(() => {
        const selected = new Set(typeKeys);
        const names = (infos ?? [])
            .filter((info) => selected.has(typeKey(info.type)))
            .flatMap((info) => info.attributes.map((a) => a.name));
        return [...new Set(names)];
    }, [infos, typeKeys]);

    const { draft, setDraft, toQuery } = query;

    const submit = useCallback(() => {
        const result = toQuery();
        if (!result.ok) {
            setQueryError(result.error);
            return;
        }
        setQueryError(null);
        const { types = [], q, geo } = result.query;
        const next: SubscriptionDraft = {
            ...toDraftMembers(values, baseline ? [] : conditionProperties(draft)),
            types,
            ...(q ? { q } : {}),
            ...(geo ? { geo } : {}),
        };
        if (baseline) {
            void update(baseline.id, subscriptionPatch(baseline, next), setBaseline).then((updated) => {
                if (!updated) return;
                setBaseline(updated);
                onUpdated?.(updated);
            });
            return;
        }
        void create(next).then((created) => {
            if (!created) return;
            setValues(initial.values);
            setDraft(queryToDraft(initial.query));
            onCreated?.(created);
        });
    }, [toQuery, values, draft, baseline, update, create, setDraft, initial, onCreated, onUpdated]);

    const resetConditions = useCallback(() => setDraft(clearConditions), [setDraft]);

    const locks = useMemo(() => unreadableLocks(baseline), [baseline]);

    const invalidFields = state.invalidFields;
    const invalid = useMemo(
        () => new Set(invalidFields.filter((field): field is SubscriptionEditorField => field in initial.values)),
        [invalidFields, initial],
    );

    const editorValue = useMemo<SubscriptionEditorContextValue>(
        () => ({
            values,
            setField,
            availableAttributes,
            invalid,
            editing: !!baseline,
            locked: locks.editor,
            error: queryError ?? state.error,
            submitting: state.submitting,
            submit,
            cancel: onCancel,
            submitLabel,
        }),
        [
            values,
            setField,
            availableAttributes,
            invalid,
            baseline,
            locks,
            queryError,
            state,
            submit,
            onCancel,
            submitLabel,
        ],
    );

    const typesError = query.typesError ? errorMessage(query.typesError) : null;
    const queryValue = useMemo<QueryBuilderContextValue>(
        () => ({
            draft,
            setDraft,
            types: query.types,
            typesLoading: query.typesLoading,
            preview: query.preview,
            error: typesError,
            busy: state.submitting,
            reset: resetConditions,
            operators,
            presets: presetLocations,
            addPreset: onAddPresetLocation,
            locked: locks.query,
        }),
        [
            draft,
            setDraft,
            query.types,
            query.typesLoading,
            query.preview,
            typesError,
            state.submitting,
            resetConditions,
            operators,
            presetLocations,
            onAddPresetLocation,
            locks,
        ],
    );

    return (
        <SubscriptionEditorProvider value={editorValue}>
            <QueryBuilderProvider value={queryValue}>{children}</QueryBuilderProvider>
        </SubscriptionEditorProvider>
    );
}
