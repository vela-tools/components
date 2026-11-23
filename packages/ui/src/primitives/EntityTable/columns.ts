import type { ColumnDefinition } from "tabulator-tables";
import { typeBadgeFormatter } from "../../utils/entity";

export function entityColumnDefs(
    columns: string[],
    { showFilters = false, typeColors }: { showFilters?: boolean; typeColors?: Record<string, string> } = {},
): ColumnDefinition[] {
    return columns.map((key) => ({
        title: key,
        field: key,
        ...(showFilters && { headerFilter: "input" as const }),
        ...(key === "type" && { formatter: typeBadgeFormatter(typeColors) }),
    }));
}
