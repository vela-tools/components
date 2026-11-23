import type { ReactNode } from "react";
import type {
    QueryBuilderDraft,
    QueryBuilderGeo,
    QueryBuilderOperator,
    QueryBuilderSavedItem,
    QueryBuilderType,
} from "./QueryBuilder.types";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type QueryBuilderSavedContextValue = {
    items: QueryBuilderSavedItem[];
    loadedId: string | null;
    load: (id: string) => void;
    runSaved?: (id: string) => void;
    save?: (name: string) => void;
    update?: () => void;
    remove?: (id: string) => void;
};

export type QueryBuilderLocks = { types?: string; conditions?: string; geo?: string };

export type QueryBuilderContextValue = {
    draft: QueryBuilderDraft;
    setDraft: (draft: QueryBuilderDraft) => void;
    types: QueryBuilderType[];
    typesLoading: boolean;
    preview: string;
    error?: ReactNode;
    busy: boolean;
    run?: () => void;
    reset: () => void;
    operators: QueryBuilderOperator[];
    presets: QueryBuilderGeo[];
    addPreset?: (location: QueryBuilderGeo) => void;
    saved?: QueryBuilderSavedContextValue;
    locked?: QueryBuilderLocks;
};

export const [QueryBuilderProvider, useQueryBuilderContext] =
    createPrimitiveContext<QueryBuilderContextValue>("QueryBuilder");
