import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { CA01, CA02, runtimeCommands } from "../listRoots";
import { CommandsProbe } from "../ListRootProbes";
import { EntityJson } from "../../src/composites/EntityJson";

afterEach(cleanup);

describe("EntityJson", () => {
    it("shows the shared entity as JSON-LD, or the empty text", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <EntityJson emptyText="// pick an entity" />
            </>,
        );
        expect(screen.getByText("// pick an entity")).toBeTruthy();
        act(() => void runtimeCommands().selectEntity(CA01));
        await waitFor(() => expect(screen.getByText(`"${CA01}"`)).toBeTruthy());
    });

    it("shows a pinned entity regardless of the shared selection", async () => {
        renderWithNgsi(
            <>
                <CommandsProbe />
                <EntityJson entityId={CA02} />
            </>,
        );
        await waitFor(() => expect(screen.getByText(`"${CA02}"`)).toBeTruthy());
        act(() => void runtimeCommands().selectEntity(CA01));
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(screen.queryByText(`"${CA01}"`)).toBeNull();
    });

    it("shows a failed request", async () => {
        renderWithNgsi(<EntityJson entityId={CA01} />, { failOn: ["entities.getEntity"] });
        expect((await screen.findByRole("alert")).textContent).toMatch(/entities\.getEntity: failed/);
    });
});
