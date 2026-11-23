import { useNgsiCommands } from "../../hooks/useNgsi";
import { useSelectionHelpers } from "../hooks";
import { selectAttributeDisabled } from "../runtime/predicates";
import { EntityListRoot } from "../../bound/EntityListRoot";
import { useQuery } from "@tanstack/react-query";
import { useEntities } from "@vela-tools/ngsi";
import { createMockNgsiAdapter } from "@vela-tools/ngsi/testing";

export function BadPart() {
    useNgsiCommands();
    useSelectionHelpers();
    useQuery({ queryKey: ["x"] });
    useEntities();
    createMockNgsiAdapter();
    return <EntityListRoot>{String(selectAttributeDisabled)}</EntityListRoot>;
}
