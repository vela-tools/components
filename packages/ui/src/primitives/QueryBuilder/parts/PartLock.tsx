import type { ReactNode } from "react";
import { Locked } from "../../Locked";
import { useQueryBuilderContext, type QueryBuilderLocks } from "../QueryBuilder.context";

export function PartLock({ part, children }: { part: keyof QueryBuilderLocks; children: ReactNode }) {
    const { locked } = useQueryBuilderContext("PartLock");
    return <Locked reason={locked?.[part]}>{children}</Locked>;
}
