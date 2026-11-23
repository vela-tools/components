import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { theme } from "../../../src/theme";
import { AppFrame, Masthead, StatusBar, ToolBar } from "../../../src/leaves/AppFrame/AppFrame";

const renderLeaf = (ui: ReactElement) => render(<MantineProvider theme={theme}>{ui}</MantineProvider>);

describe("AppFrame", () => {
    it("Masthead shows brand, app name, edition and version", () => {
        renderLeaf(<Masthead appName="Telescopium" edition="FOSS" version="1.2.3" />);
        const header = screen.getByRole("banner");
        expect(header.textContent).toBe("Vela/TelescopiumFOSSv1.2.3");
    });

    it("Masthead leaves out edition and version when not given", () => {
        renderLeaf(<Masthead appName="Aquila" brand="Senlab" />);
        expect(screen.getByRole("banner").textContent).toBe("Senlab/Aquila");
    });

    it("renders masthead, toolbar, content and status bar in order", () => {
        renderLeaf(
            <AppFrame
                masthead={<Masthead appName="Aquila" />}
                toolbar={<ToolBar>tools</ToolBar>}
                statusBar={<StatusBar>status</StatusBar>}
            >
                content
            </AppFrame>,
        );
        const banner = screen.getByRole("banner");
        const main = screen.getByRole("main");
        const footer = screen.getByRole("contentinfo");
        expect(main.textContent).toBe("content");
        expect(footer.textContent).toBe("status");
        expect(
            banner.compareDocumentPosition(screen.getByText("tools")) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(screen.getByText("tools").compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
