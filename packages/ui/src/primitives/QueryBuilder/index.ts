import { Actions, Conditions, EntityTypes, Error, GeoRegion, Preview, SavedQueries } from "./parts";

export const QueryBuilder = {
    EntityTypes,
    Conditions,
    Preview,
    Actions,
    Error,
    GeoRegion,
    SavedQueries,
};

export type QueryBuilderParts = typeof QueryBuilder;

export { QueryBuilderProvider, useQueryBuilderContext } from "./QueryBuilder.context";
export type {
    QueryBuilderContextValue,
    QueryBuilderLocks,
    QueryBuilderSavedContextValue,
} from "./QueryBuilder.context";
export type { QueryBuilderConditionsProps, QueryBuilderPartProps } from "./parts";
export { newQueryCondition, DEFAULT_OPERATORS as DEFAULT_QUERY_OPERATORS } from "./queryBuilder.utils";
export type {
    QueryBuilderType,
    QueryBuilderCondition,
    QueryBuilderGeo,
    QueryBuilderDraft,
    QueryBuilderSavedItem,
    QueryBuilderOperator,
} from "./QueryBuilder.types";
