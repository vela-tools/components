import { TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { NgsiLdEntity } from "@vela-tools/ngsi";
import { type EntityQuery } from "@vela-tools/ngsi";
import { useFamilyContext } from "../Family.context";
import { formatLabel } from "../../utils/hooksFormat";

export function GoodPart({ entity, query }: { entity: NgsiLdEntity; query: EntityQuery }) {
    const { label } = useFamilyContext("GoodPart");
    const [opened] = useDisclosure(false);
    return (
        <TextInput label={formatLabel(label)} value={entity.id} readOnly={opened} data-types={query.types?.length} />
    );
}
