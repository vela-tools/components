import type { CSSProperties } from "react";
import { Stack, Tabs } from "@mantine/core";
import { EntityDetailsTable, EntityTable } from "@vela-tools/ui";
import { EntityDetailsRoot } from "../bound/EntityDetailsRoot";
import { EntityTableRoot } from "../bound/EntityTableRoot";
import { EntityJson } from "./EntityJson";

export type EntityBrowserProps = {
    defaultColumns?: string[];
    detailsHeight?: number | string;
    typeColors?: Record<string, string>;
    autoGenerateTypeColors?: boolean;
    pageSize?: number;
    className?: string;
    style?: CSSProperties;
};

const rootStyle: CSSProperties = {
    background: "var(--vela-color-bg)",
    border: "1px solid var(--vela-color-border)",
};

const errorStyle: CSSProperties = { padding: "4px var(--mantine-spacing-sm)" };

const tabStyles = {
    list: { borderTop: "1px solid var(--vela-color-border)", borderBottom: "none" },
    tab: { height: 30, fontSize: 13, fontFamily: "var(--mantine-font-family-monospace)", fontWeight: 700 },
};

const headerStyle: CSSProperties = { marginLeft: "auto", marginTop: 4, marginRight: 4 };

export function EntityBrowser({
    defaultColumns,
    detailsHeight,
    typeColors,
    autoGenerateTypeColors = false,
    pageSize,
    className,
    style,
}: EntityBrowserProps) {
    return (
        <Stack gap={0} className={className} style={{ ...rootStyle, ...style }}>
            <EntityTableRoot
                defaultColumns={defaultColumns}
                typeColors={typeColors}
                autoGenerateTypeColors={autoGenerateTypeColors}
                pageSize={pageSize}
            >
                <EntityTable.Toolbar />
                <EntityTable.Error style={errorStyle} />
                <EntityTable.Grid />
            </EntityTableRoot>
            <EntityDetailsRoot>
                <Tabs defaultValue="properties" styles={tabStyles}>
                    <Tabs.List>
                        <Tabs.Tab value="properties">Properties</Tabs.Tab>
                        <Tabs.Tab value="rawjson">Raw JSON-LD</Tabs.Tab>
                        <EntityDetailsTable.Header style={headerStyle} />
                    </Tabs.List>
                    <Tabs.Panel value="properties">
                        <EntityDetailsTable.Error style={errorStyle} />
                        <EntityDetailsTable.Grid
                            height={detailsHeight}
                            colorAttributeTypes={autoGenerateTypeColors || typeColors !== undefined}
                        />
                    </Tabs.Panel>
                    <Tabs.Panel value="rawjson">
                        <EntityJson />
                    </Tabs.Panel>
                </Tabs>
            </EntityDetailsRoot>
        </Stack>
    );
}
