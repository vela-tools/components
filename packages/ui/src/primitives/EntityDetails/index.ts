import { Error, Grid, Header } from "./parts";

export const EntityDetailsTable = {
    Grid,
    Header,
    Error,
};

export type EntityDetailsParts = typeof EntityDetailsTable;

export { EntityDetailsProvider, useEntityDetailsContext } from "./EntityDetails.context";
export type { EntityDetailsContextValue } from "./EntityDetails.context";
export type { EntityDetailsGridProps, EntityDetailsHeaderProps, EntityDetailsPartProps } from "./parts";
