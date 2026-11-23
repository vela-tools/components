import { Paper, Text } from "@mantine/core";
import { BinocularsIcon } from "@phosphor-icons/react";
import { BrokerStatus } from "@vela-tools/ngsi";
import { AppFrame, Masthead, StatusBar, ToolBar } from "@vela-tools/ui";
import { Page } from "../Page";

export function AppFramePage() {
    return (
        <Page title="AppFrame" description="Shared shell for Vela apps: Masthead, ToolBar, content and StatusBar.">
            <Paper withBorder style={{ overflow: "hidden" }}>
                <AppFrame
                    style={{ height: 320 }}
                    masthead={
                        <Masthead
                            icon={<BinocularsIcon weight="fill" />}
                            appName="Playground"
                            edition="FOSS"
                            version="0.0.0"
                        />
                    }
                    toolbar={
                        <ToolBar>
                            <BrokerStatus />
                        </ToolBar>
                    }
                    statusBar={<StatusBar>12 entities</StatusBar>}
                >
                    <Text p="md">App content</Text>
                </AppFrame>
            </Paper>
        </Page>
    );
}
