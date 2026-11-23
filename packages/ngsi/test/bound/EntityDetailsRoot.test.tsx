import { useEffect } from "react";
import { EntityDetailsTable, useEntityDetailsContext, type EntityDetailsContextValue } from "@vela-tools/ui";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { CA01, CA02, runtimeCommands } from "../listRoots";
import { CommandsProbe } from "../ListRootProbes";
import { EntityDetailsRoot } from "../../src/bound/EntityDetailsRoot";

afterEach(cleanup);

const contracts: Record<string, EntityDetailsContextValue> = {};

function Probe({ label, onValue }: { label: string; onValue?: (value: EntityDetailsContextValue) => void }) {
    const value = useEntityDetailsContext("Probe");
    useEffect(() => {
        contracts[label] = value;
        onValue?.(value);
    }, [label, value, onValue]);
    return null;
}

const entityOf = (label: string) => contracts[label].entity?.id ?? null;

describe("EntityDetailsRoot", () => {
    it("follows the shared entity", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <EntityDetailsRoot>
                    <Probe label="shared" />
                    <EntityDetailsTable.Header />
                </EntityDetailsRoot>
            </>,
        );
        expect(screen.getByText("No entity selected")).toBeTruthy();
        expect(entityOf("shared")).toBeNull();
        act(() => void runtimeCommands().selectEntity(CA01));
        await waitFor(() => expect(entityOf("shared")).toBe(CA01));
        expect(screen.getByText(new RegExp(CA01))).toBeTruthy();
    });

    it("a pinned entityId ignores the shared selection", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <EntityDetailsRoot entityId={CA02}>
                    <Probe label="pinned" />
                </EntityDetailsRoot>
            </>,
        );
        await waitFor(() => expect(entityOf("pinned")).toBe(CA02));
        act(() => void runtimeCommands().selectEntity(CA01));
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(entityOf("pinned")).toBe(CA02);
    });

    it("shows a failed request", async () => {
        renderWithNgsi(
            <EntityDetailsRoot entityId={CA01}>
                <EntityDetailsTable.Error />
            </EntityDetailsRoot>,
            { failOn: ["entities.getEntity"] },
        );
        expect((await screen.findByRole("alert")).textContent).toMatch(/entities\.getEntity: failed/);
    });

    it("keeps the contract value stable while nothing changes", async () => {
        const onValue = vi.fn();
        const ui = () => (
            <EntityDetailsRoot entityId={CA01}>
                <Probe label="stable" onValue={onValue} />
            </EntityDetailsRoot>
        );
        const { rerender } = renderWithNgsi(ui());
        await waitFor(() => expect(entityOf("stable")).toBe(CA01));
        const calls = onValue.mock.calls.length;
        rerender(ui());
        expect(onValue).toHaveBeenCalledTimes(calls);
    });
});
