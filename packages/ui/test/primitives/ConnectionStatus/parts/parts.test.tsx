import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fakeConnectionStatusContext } from "../../../connectionStatusContext";
import { renderPart } from "../../../renderPart";
import { ConnectionStatusProvider } from "../../../../src/primitives/ConnectionStatus/ConnectionStatusProvider";
import { Card } from "../../../../src/primitives/ConnectionStatus/parts/Card";
import { DetailsModal } from "../../../../src/primitives/ConnectionStatus/parts/DetailsModal";
import { Indicator } from "../../../../src/primitives/ConnectionStatus/parts/Indicator";
import { Name } from "../../../../src/primitives/ConnectionStatus/parts/Name";
import { Url } from "../../../../src/primitives/ConnectionStatus/parts/Url";

const statusOf = (name: string) => screen.getByText(name).closest("[data-status]")?.getAttribute("data-status");

describe("ConnectionStatus parts", () => {
    it("Card shows the indicator, name and URL by default", () => {
        renderPart(<Card />, ConnectionStatusProvider, fakeConnectionStatusContext());
        expect(screen.getByRole("status").textContent).toBe("Broker · connected");
        expect(screen.getByText("Den Haag")).toBeTruthy();
        expect(screen.getByText("https://broker.example/ngsi-ld/v1")).toBeTruthy();
        expect(statusOf("Den Haag")).toBe("connected");
    });

    it("Card renders custom content", () => {
        renderPart(
            <Card>
                <Name />
            </Card>,
            ConnectionStatusProvider,
            fakeConnectionStatusContext(),
        );
        expect(screen.getByText("Den Haag")).toBeTruthy();
        expect(screen.queryByRole("status")).toBeNull();
        expect(screen.queryByText("https://broker.example/ngsi-ld/v1")).toBeNull();
    });

    it("Indicator shows the status with a custom label", () => {
        renderPart(
            <Indicator label="Server" />,
            ConnectionStatusProvider,
            fakeConnectionStatusContext({ status: "error" }),
        );
        expect(screen.getByRole("status").textContent).toBe("Server · unreachable");
    });

    it("Url renders nothing without a URL", () => {
        renderPart(<Url />, ConnectionStatusProvider, fakeConnectionStatusContext({ url: undefined }));
        expect(screen.queryByText(/https/)).toBeNull();
    });

    it("Card shows the error on hover", async () => {
        renderPart(
            <Card />,
            ConnectionStatusProvider,
            fakeConnectionStatusContext({ status: "error", error: "Broker down" }),
        );
        fireEvent.mouseEnter(screen.getByText("Den Haag").closest("[data-status]") as HTMLElement);
        expect(await screen.findByText("Broker down")).toBeTruthy();
    });

    it("Card is not clickable and DetailsModal renders nothing without details", () => {
        renderPart(
            <>
                <Card />
                <DetailsModal />
            </>,
            ConnectionStatusProvider,
            fakeConnectionStatusContext(),
        );
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("clicking the Card opens the details in DetailsModal", async () => {
        renderPart(
            <>
                <Card />
                <DetailsModal />
            </>,
            ConnectionStatusProvider,
            fakeConnectionStatusContext({ details: <p>Broker config</p> }),
        );
        expect(screen.queryByText("Broker config")).toBeNull();
        fireEvent.click(screen.getByRole("button"));
        expect(await screen.findByText("Broker config")).toBeTruthy();
    });
});
