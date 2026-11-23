import type { ReactNode } from "react";
import type { EntityRecord } from "../../utils/entity";
import { createPrimitiveContext } from "../createPrimitiveContext";

export type EntityDetailsContextValue = {
    entity: EntityRecord | null;
    stale: boolean;
    error?: ReactNode;
};

export const [EntityDetailsProvider, useEntityDetailsContext] =
    createPrimitiveContext<EntityDetailsContextValue>("EntityDetails");
