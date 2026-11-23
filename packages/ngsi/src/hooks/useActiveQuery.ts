import type { SelectionState } from "../runtime/store";
import type { EntityQuery } from "../types";
import { useNgsiSelector } from "./useNgsiSelector";

const selectQuery = (s: SelectionState) => s.query;

export function useActiveQuery(): EntityQuery {
    return useNgsiSelector(selectQuery);
}
