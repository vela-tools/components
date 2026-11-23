import type { CSSProperties, ReactNode } from "react";
import { Grid, Stack } from "@mantine/core";
import { ItemPicker } from "@vela-tools/ui";
import { AttributeListRoot } from "../bound/AttributeListRoot";
import { EntityListRoot } from "../bound/EntityListRoot";
import { TypeListRoot } from "../bound/TypeListRoot";
import type { NgsiLdEntity } from "../types";

export type EntityPickerProps = {
    onPick: (entity: NgsiLdEntity, attribute: string) => void;
    height?: number | string;
    className?: string;
    style?: CSSProperties;
};

const border = "1px solid var(--mantine-color-gray-3)";

function Column({ title }: { title: ReactNode }) {
    return (
        <Stack gap={0} h="100%" style={{ minHeight: 0 }}>
            <ItemPicker.Error />
            <ItemPicker.Header title={title} />
            <ItemPicker.Filter />
            <ItemPicker.Empty />
            <ItemPicker.List />
        </Stack>
    );
}

export function EntityPicker({ onPick, height = 350, className, style }: EntityPickerProps) {
    return (
        <Grid className={className} style={{ border, ...style }}>
            <Grid.Col span={4} h={height} style={{ borderRight: border }}>
                <TypeListRoot>
                    <Column title="Entity types" />
                </TypeListRoot>
            </Grid.Col>
            <Grid.Col span={4} h={height} style={{ borderRight: border }}>
                <EntityListRoot>
                    <Column title="Entities" />
                </EntityListRoot>
            </Grid.Col>
            <Grid.Col span={4} h={height}>
                <AttributeListRoot onUse={(attribute, entity) => onPick(entity, attribute)}>
                    <Column title="Attributes" />
                </AttributeListRoot>
            </Grid.Col>
        </Grid>
    );
}
