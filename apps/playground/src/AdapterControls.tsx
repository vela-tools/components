import { Checkbox, RangeSlider, SegmentedControl, Stack, Switch, Text, Title } from "@mantine/core";
import type { MockMethod } from "@vela-tools/ngsi/testing";
import {
    brokerConfig,
    CAPABILITIES,
    DEFAULT_CAPABILITIES,
    MOCK_METHODS,
    type AdapterMode,
    type AdapterSettings,
} from "./adapters";

type AdapterControlsProps = {
    settings: AdapterSettings;
    onChange: (settings: AdapterSettings) => void;
};

export function AdapterControls({ settings, onChange }: AdapterControlsProps) {
    const isMock = settings.mode === "mock";
    const update = (patch: Partial<AdapterSettings>) => onChange({ ...settings, ...patch });

    const changeMode = (value: string) => {
        const mode = value as AdapterMode;
        update({ mode, capabilities: DEFAULT_CAPABILITIES[mode] });
    };

    return (
        <Stack gap="sm">
            <Title order={5}>Adapter</Title>
            <SegmentedControl
                value={settings.mode}
                onChange={changeMode}
                data={[
                    { label: "Mock", value: "mock" },
                    { label: "Broker", value: "broker", disabled: !brokerConfig.url },
                ]}
            />
            {brokerConfig.url ? (
                !isMock && (
                    <Text size="xs" c="dimmed">
                        {brokerConfig.url}
                    </Text>
                )
            ) : (
                <Text size="xs" c="dimmed">
                    Set VITE_BROKER_URL to use a real broker.
                </Text>
            )}

            <Text size="sm" fw={500}>
                Capabilities
            </Text>
            {CAPABILITIES.map((key) => (
                <Switch
                    key={key}
                    size="xs"
                    label={key}
                    checked={settings.capabilities[key]}
                    onChange={(event) =>
                        update({ capabilities: { ...settings.capabilities, [key]: event.currentTarget.checked } })
                    }
                />
            ))}

            {isMock && (
                <>
                    <Text size="sm" fw={500}>
                        Latency: {settings.latencyMs[0]}–{settings.latencyMs[1]} ms
                    </Text>
                    <RangeSlider
                        min={0}
                        max={3000}
                        step={100}
                        minRange={0}
                        label={null}
                        defaultValue={settings.latencyMs}
                        onChangeEnd={(latencyMs) => update({ latencyMs })}
                    />
                    <Checkbox.Group
                        label="Fail on"
                        value={settings.failOn}
                        onChange={(failOn) => update({ failOn: failOn as MockMethod[] })}
                    >
                        <Stack gap={4} mt={4}>
                            {MOCK_METHODS.map((method) => (
                                <Checkbox key={method} size="xs" value={method} label={method} />
                            ))}
                        </Stack>
                    </Checkbox.Group>
                </>
            )}
        </Stack>
    );
}
