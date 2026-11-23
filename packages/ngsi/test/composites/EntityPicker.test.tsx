import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithNgsi } from "../renderWithNgsi";
import { CA01 } from "../listRoots";
import { EntityPicker } from "../../src/composites/EntityPicker";

afterEach(cleanup);

const column = (title: string) => within(screen.getByText(title).parentElement!);

async function pickCameraStatus() {
    fireEvent.click(await column("Entity types").findByRole("button", { name: "Camera" }));
    await waitFor(() => expect(column("Entities").queryByRole("button", { name: /VirtualCameraSensor/ })).toBeNull());
    fireEvent.click(column("Entities").getByRole("button", { name: CA01 }));
    return column("Attributes").findByRole("button", { name: "status" });
}

describe("EntityPicker", () => {
    it("shows the three titled columns", () => {
        renderWithNgsi(<EntityPicker onPick={vi.fn()} />);
        expect(screen.getByText("Entity types")).toBeTruthy();
        expect(screen.getByText("Entities")).toBeTruthy();
        expect(screen.getByText("Attributes")).toBeTruthy();
    });

    it("loads the entities of the picked type and the attributes of the picked entity", async () => {
        renderWithNgsi(<EntityPicker onPick={vi.fn()} />);
        await pickCameraStatus();
        expect(column("Entities").getByRole("button", { name: "urn:ngsi-ld:Camera:camera-2" })).toBeTruthy();
        expect(column("Attributes").getByRole("button", { name: "location" })).toBeTruthy();
        expect(column("Attributes").queryByRole("button", { name: "id" })).toBeNull();
    });

    it("calls onPick with the entity and attribute on Use", async () => {
        const onPick = vi.fn();
        renderWithNgsi(<EntityPicker onPick={onPick} />);
        const status = await pickCameraStatus();
        fireEvent.click(within(status.parentElement!).getByRole("button", { name: "Use" }));
        expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: CA01, type: "Camera" }), "status");
        expect(status.getAttribute("aria-pressed")).toBe("true");
    });

    it("filters a column", async () => {
        renderWithNgsi(<EntityPicker onPick={vi.fn()} />);
        await column("Entity types").findByRole("button", { name: "Camera" });
        fireEvent.change(column("Entity types").getByRole("textbox"), { target: { value: "osm" } });
        expect(column("Entity types").queryByRole("button", { name: "Camera" })).toBeNull();
        expect(column("Entity types").getByRole("button", { name: "OSMPlace" })).toBeTruthy();
    });

    it("shows a failed type request", async () => {
        renderWithNgsi(<EntityPicker onPick={vi.fn()} />, { failOn: ["entities.listTypes"] });
        expect(await column("Entity types").findByRole("alert")).toBeTruthy();
    });
});
