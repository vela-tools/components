import { useState } from "react";
import clsx from "clsx";
import {
    Box,
    Button,
    Checkbox,
    Group,
    NumberInput,
    Popover,
    Stack,
    Tabs,
    Text,
    TextInput,
    UnstyledButton,
} from "@mantine/core";
import { MapPinIcon } from "@phosphor-icons/react";
import type { QueryBuilderGeo } from "../QueryBuilder.types";
import { geoFromInputs, geoLabel, sameGeo } from "../queryBuilder.utils";
import { useQueryBuilderContext } from "../QueryBuilder.context";
import classes from "./QueryBuilder.module.css";
import type { PartProps } from "./types";
import { PartLock } from "./PartLock";

type Inputs = { lat: number | string; lon: number | string; radius: number | string };

const inputsFrom = (geo: QueryBuilderGeo | null | undefined): Inputs =>
    geo ? { lat: geo.lat, lon: geo.lon, radius: geo.radiusKm } : { lat: "", lon: "", radius: 5 };

export function GeoRegion({ className, style }: PartProps) {
    const { draft, setDraft, presets, addPreset } = useQueryBuilderContext("GeoRegion");
    const { geo } = draft;
    const setGeo = (next: QueryBuilderGeo | null) => setDraft({ ...draft, geo: next });

    const [enabledByUser, setEnabledByUser] = useState(true);
    const enabled = geo !== null || enabledByUser;

    const [editOpen, setEditOpen] = useState(false);
    const [inputs, setInputs] = useState<Inputs>(() => inputsFrom(geo));
    const [presetName, setPresetName] = useState("");

    const typed = geoFromInputs(inputs.lat, inputs.lon, inputs.radius);
    const setInput = (field: keyof Inputs) => (value: number | string) => setInputs((i) => ({ ...i, [field]: value }));

    const toggleEdit = () => {
        if (!editOpen) setInputs(inputsFrom(geo ?? presets[0]));
        setEditOpen((open) => !open);
    };

    const choose = (next: QueryBuilderGeo) => {
        setGeo(next);
        setEditOpen(false);
    };

    const apply = () => {
        if (typed) choose(typed);
    };

    const savePreset = () => {
        const preset = geoFromInputs(inputs.lat, inputs.lon, inputs.radius, presetName);
        if (!preset?.label || !addPreset) return;
        addPreset(preset);
        setPresetName("");
        choose(preset);
    };

    return (
        <PartLock part="geo">
            <Box className={clsx(classes.geo, className)} style={style}>
                <Group justify="space-between" style={{ padding: "8px 12px 6px" }}>
                    <Text className={classes.sectionHeader}>Geo region</Text>
                    <Checkbox
                        checked={enabled}
                        onChange={(e) => {
                            const checked = e.currentTarget.checked;
                            setEnabledByUser(checked);
                            if (!checked) setGeo(null);
                        }}
                        label="Enabled"
                        size="xs"
                        styles={{
                            label: {
                                color: enabled ? "var(--vela-color-text)" : "var(--vela-color-text4)",
                                fontSize: 11,
                            },
                        }}
                    />
                </Group>

                <Box
                    style={{
                        padding: "0 12px 8px",
                        opacity: enabled ? 1 : 0.4,
                        pointerEvents: enabled ? undefined : "none",
                    }}
                    aria-disabled={!enabled}
                >
                    <Group justify="space-between" className={classes.geoBox}>
                        <Group gap={5} style={{ minWidth: 0, flex: 1 }}>
                            <MapPinIcon size={12} color="var(--vela-accent)" style={{ flexShrink: 0 }} />
                            <Text c="var(--vela-color-text)" className={classes.geoLabel}>
                                {geoLabel(geo)}
                            </Text>
                        </Group>

                        <Popover
                            opened={editOpen}
                            onClose={() => setEditOpen(false)}
                            position="right-start"
                            offset={14}
                            width={290}
                            withinPortal
                            withArrow
                            arrowSize={8}
                        >
                            <Popover.Target>
                                <UnstyledButton
                                    onClick={toggleEdit}
                                    disabled={!enabled}
                                    style={{
                                        color: "var(--vela-accent)",
                                        fontSize: 11,
                                        fontWeight: 500,
                                        lineHeight: 1,
                                        flexShrink: 0,
                                    }}
                                >
                                    Edit
                                </UnstyledButton>
                            </Popover.Target>

                            <Popover.Dropdown style={{ padding: 0, overflow: "hidden" }}>
                                <Tabs defaultValue={presets.length > 0 ? "preset" : "coordinates"}>
                                    <Tabs.List style={{ padding: "0 12px", minHeight: 42 }}>
                                        <Tabs.Tab value="preset" style={{ fontSize: 14, padding: "0 14px" }}>
                                            Preset
                                        </Tabs.Tab>
                                        <Tabs.Tab value="coordinates" style={{ fontSize: 14, padding: "0 14px" }}>
                                            Coordinates
                                        </Tabs.Tab>
                                    </Tabs.List>

                                    <Tabs.Panel value="preset" p="sm">
                                        {presets.length === 0 ? (
                                            <Text size="xs" c="var(--vela-color-text4)">
                                                No presets yet.
                                            </Text>
                                        ) : (
                                            <Stack gap={5} className={`${classes.presetList} vela-thin-scroll`}>
                                                {presets.map((preset, i) => {
                                                    const active = sameGeo(geo, preset);
                                                    return (
                                                        <UnstyledButton
                                                            key={`${preset.label ?? ""}|${preset.lat}|${preset.lon}|${i}`}
                                                            className={classes.presetRow}
                                                            data-active={active}
                                                            aria-pressed={active}
                                                            onClick={() => choose(preset)}
                                                        >
                                                            <Text
                                                                fw={active ? 600 : 400}
                                                                c={
                                                                    active
                                                                        ? "var(--vela-accent)"
                                                                        : "var(--vela-color-text)"
                                                                }
                                                                style={{ fontSize: 12 }}
                                                            >
                                                                {preset.label ?? `${preset.lat}°, ${preset.lon}°`}
                                                            </Text>
                                                            <Text
                                                                c="var(--vela-color-text4)"
                                                                style={{ fontSize: 10, marginLeft: 8 }}
                                                            >
                                                                {preset.radiusKm} km · {preset.lat}, {preset.lon}
                                                            </Text>
                                                        </UnstyledButton>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </Tabs.Panel>

                                    <Tabs.Panel value="coordinates" p="sm">
                                        <Stack gap={12}>
                                            <Group grow gap={8}>
                                                <NumberInput
                                                    label="Latitude"
                                                    size="md"
                                                    placeholder="52.08"
                                                    value={inputs.lat}
                                                    onChange={setInput("lat")}
                                                    min={-90}
                                                    max={90}
                                                    decimalScale={6}
                                                    step={0.01}
                                                />
                                                <NumberInput
                                                    label="Longitude"
                                                    size="md"
                                                    placeholder="4.31"
                                                    value={inputs.lon}
                                                    onChange={setInput("lon")}
                                                    min={-180}
                                                    max={180}
                                                    decimalScale={6}
                                                    step={0.01}
                                                />
                                            </Group>
                                            <NumberInput
                                                label="Radius (km)"
                                                size="md"
                                                placeholder="5"
                                                value={inputs.radius}
                                                onChange={setInput("radius")}
                                                min={0.1}
                                                decimalScale={1}
                                                step={0.5}
                                            />
                                            <Button
                                                size="md"
                                                variant="filled"
                                                color="violet"
                                                onClick={apply}
                                                disabled={!typed}
                                                fullWidth
                                            >
                                                Apply
                                            </Button>

                                            {addPreset && (
                                                <Box
                                                    style={{
                                                        borderTop: "1px solid var(--vela-color-border)",
                                                        paddingTop: 12,
                                                    }}
                                                >
                                                    <Text c="var(--vela-color-text4)" mb={8} style={{ fontSize: 12 }}>
                                                        Save as preset
                                                    </Text>
                                                    <Group gap={6}>
                                                        <TextInput
                                                            placeholder="Preset name…"
                                                            aria-label="Preset name"
                                                            size="md"
                                                            value={presetName}
                                                            onChange={(e) => setPresetName(e.currentTarget.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && savePreset()}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <Button
                                                            size="md"
                                                            variant="light"
                                                            color="violet"
                                                            onClick={savePreset}
                                                            disabled={!presetName.trim() || !typed}
                                                        >
                                                            Save
                                                        </Button>
                                                    </Group>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Tabs.Panel>
                                </Tabs>
                            </Popover.Dropdown>
                        </Popover>
                    </Group>
                </Box>
            </Box>
        </PartLock>
    );
}
