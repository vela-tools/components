import { useEffect, useRef, useState, type RefObject } from "react";
import { TabulatorFull as Tabulator, type ColumnDefinition, type RowComponent } from "tabulator-tables";
import type { EntityRow } from "../../utils/entity";

type UseEntityTableOptions = {
    rows: EntityRow[];
    columnDefs: ColumnDefinition[];
    selectedId?: string | null;
    pageSize: number;
    onRowClick?: (row: EntityRow) => void;
};

function syncSelection(table: Tabulator, id: string | null | undefined) {
    table.deselectRow();
    const row = id ? table.getRow(id) : false;
    if (row) {
        row.select();
        void table.setPageToRow(row);
    }
}

export function useEntityTable(
    containerRef: RefObject<HTMLDivElement | null>,
    { rows, columnDefs, selectedId, pageSize, onRowClick }: UseEntityTableOptions,
) {
    const tableRef = useRef<Tabulator | null>(null);
    const [ready, setReady] = useState(false);

    const onRowClickRef = useRef(onRowClick);
    const selectedIdRef = useRef(selectedId);
    const initialRef = useRef({ columnDefs, pageSize });

    useEffect(() => {
        onRowClickRef.current = onRowClick;
        selectedIdRef.current = selectedId;
    });

    useEffect(() => {
        if (!containerRef.current) return;
        const table = new Tabulator(containerRef.current, {
            index: "id",
            data: [],
            columns: initialRef.current.columnDefs,
            layout: "fitColumns",
            pagination: true,
            paginationSize: initialRef.current.pageSize,
            selectableRows: 1,
        });
        table.on("tableBuilt", () => setReady(true));
        table.on("rowClick", (_e: UIEvent, row: RowComponent) => onRowClickRef.current?.(row.getData() as EntityRow));
        tableRef.current = table;
        return () => {
            table.destroy();
            tableRef.current = null;
            setReady(false);
        };
    }, [containerRef]);

    useEffect(() => {
        const table = tableRef.current;
        if (!ready || !table) return;
        const page = table.getPage();
        void table.replaceData(rows).then(() => {
            const max = table.getPageMax();
            if (typeof page === "number" && typeof max === "number" && max > 0) void table.setPage(Math.min(page, max));
            syncSelection(table, selectedIdRef.current);
        });
    }, [ready, rows]);

    useEffect(() => {
        if (ready && tableRef.current) tableRef.current.setColumns(columnDefs);
    }, [ready, columnDefs]);

    useEffect(() => {
        if (ready && tableRef.current) tableRef.current.setPageSize(pageSize);
    }, [ready, pageSize]);

    useEffect(() => {
        if (ready && tableRef.current) syncSelection(tableRef.current, selectedId);
    }, [ready, selectedId]);
}
