import { useEffect } from "react";
import { ConnectionStatusCard, useConnectionStatusContext, type ConnectionStatusContextValue } from "@vela-tools/ui";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { ConnectionStatusRoot } from "../../src/bound/ConnectionStatusRoot";

afterEach(cleanup);

const statusOf = (name: string) => screen.getByText(name).closest("[data-status]")?.getAttribute("data-status");

function Probe({ onValue }: { onValue: (value: ConnectionStatusContextValue) => void }) {
    const value = useConnectionStatusContext("Probe");
    useEffect(() => onValue(value), [value, onValue]);
    return null;
}

describe("ConnectionStatusRoot", () => {
    it("fills the contract from the provider broker, connecting until the types load", async () => {
        renderWithNgsi(
            <ConnectionStatusRoot>
                <ConnectionStatusCard.Card />
            </ConnectionStatusRoot>,
            { latencyMs: 30 },
        );
        expect(screen.getByRole("status").textContent).toContain("connecting");
        await waitFor(() => expect(statusOf("Test")).toBe("connected"));
    });

    it("reports a failed broker with the error message", async () => {
        renderWithNgsi(
            <ConnectionStatusRoot>
                <ConnectionStatusCard.Indicator />
                <ConnectionStatusCard.Name />
            </ConnectionStatusRoot>,
            { failOn: ["entities.listTypes"] },
        );
        await waitFor(() => expect(screen.getByRole("status").textContent).toContain("unreachable"));
        expect(screen.getByText("Test")).toBeTruthy();
    });

    it("opens the details from a custom layout", async () => {
        renderWithNgsi(
            <ConnectionStatusRoot details={<p>Broker config</p>}>
                <ConnectionStatusCard.Card>
                    <ConnectionStatusCard.Name />
                </ConnectionStatusCard.Card>
                <ConnectionStatusCard.DetailsModal title="Settings" />
            </ConnectionStatusRoot>,
        );
        fireEvent.click(screen.getByRole("button"));
        expect(await screen.findByText("Broker config")).toBeTruthy();
        expect(screen.getByText("Settings")).toBeTruthy();
    });

    it("keeps the contract value stable while nothing changes", async () => {
        const onValue = vi.fn();
        const { rerender } = renderWithNgsi(
            <ConnectionStatusRoot>
                <Probe onValue={onValue} />
            </ConnectionStatusRoot>,
        );
        await waitFor(() => expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ status: "connected" })));
        const calls = onValue.mock.calls.length;
        rerender(
            <ConnectionStatusRoot>
                <Probe onValue={onValue} />
            </ConnectionStatusRoot>,
        );
        expect(onValue).toHaveBeenCalledTimes(calls);
    });
});
