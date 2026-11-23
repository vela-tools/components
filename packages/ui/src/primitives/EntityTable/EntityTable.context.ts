import type { ReactNode } from "react";
import type { EntityRecord } from "../../utils/entity";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type EntityTableContextValue = {
    entities: EntityRecord[];
    defaultColumns: string[];
    columns: string[];
    setColumns?: (columns: string[]) => void;
    selectedId: string | null;
    select: (id: string | null) => void;
    showFilters: boolean;
    setShowFilters?: (show: boolean) => void;
    typeColors?: Record<string, string>;
    pageSize: number;
    stale: boolean;
    error?: ReactNode;
};

export const [EntityTableProvider, useEntityTableContext] =
    createPrimitiveContext<EntityTableContextValue>("EntityTable");
