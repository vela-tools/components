import { describe, expect, it } from "vitest";
import { entityColumnDefs } from "../../../src/primitives/EntityTable/columns";

describe("entityColumnDefs", () => {
    it("maps each column to a field", () => {
        expect(entityColumnDefs(["id", "status"])).toEqual([
            { title: "id", field: "id" },
            { title: "status", field: "status" },
        ]);
    });

    it("adds header filters on request", () => {
        expect(entityColumnDefs(["id"], { showFilters: true })[0]).toMatchObject({ headerFilter: "input" });
    });

    it("formats only the type column", () => {
        const [id, type] = entityColumnDefs(["id", "type"]);
        expect(id.formatter).toBeUndefined();
        expect(typeof type.formatter).toBe("function");
    });
});
