import { useMemo } from "react";
import { Button, Checkbox, Popover, ScrollArea, Stack, Text } from "@mantine/core";
import { columnGroups } from "../../utils/entity";
import classes from "./ColumnChooser.module.css";
import type { ColumnChooserProps } from "./ColumnChooser.types";

export function ColumnChooser({
    entities,
    defaultColumns,
    value,
    onChange,
    label = "Columns",
    width = 100,
    className,
    style,
}: ColumnChooserProps) {
    const groups = useMemo(() => columnGroups(entities), [entities]);

    return (
        <Popover>
            <Popover.Target>
                <Button className={classes.button} w={width}>
                    {label}
                </Button>
            </Popover.Target>
            <Popover.Dropdown className={className} style={style}>
                <Checkbox.Group value={value} onChange={onChange}>
                    <ScrollArea h={400}>
                        <Stack gap={0}>
                            {defaultColumns.map((col) => (
                                <Checkbox className={classes.checkbox} key={col} value={col} label={col} />
                            ))}
                            {groups.map((group) => (
                                <Stack key={group.type} gap={0}>
                                    <Text className={classes.group}>{group.type}</Text>
                                    {group.attributes
                                        .filter((attr) => !defaultColumns.includes(attr))
                                        .map((attr) => (
                                            <Checkbox
                                                className={classes.checkbox}
                                                key={attr}
                                                value={attr}
                                                label={attr}
                                            />
                                        ))}
                                </Stack>
                            ))}
                        </Stack>
                    </ScrollArea>
                </Checkbox.Group>
            </Popover.Dropdown>
        </Popover>
    );
}
