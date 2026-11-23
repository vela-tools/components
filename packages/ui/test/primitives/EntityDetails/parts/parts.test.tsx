import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fakeEntityDetailsContext } from "../../../entityDetailsContext";
import { renderPart } from "../../../renderPart";
import { EntityDetailsProvider } from "../../../../src/primitives/EntityDetails/EntityDetails.context";
import { Error } from "../../../../src/primitives/EntityDetails/parts/Error";
import { Grid } from "../../../../src/primitives/EntityDetails/parts/Grid";
import { Header } from "../../../../src/primitives/EntityDetails/parts/Header";

describe("EntityDetails parts", () => {
    it("Header shows the type and id of the entity", () => {
        renderPart(<Header />, EntityDetailsProvider, fakeEntityDetailsContext());
        expect(screen.getByText("Camera")).toBeTruthy();
        expect(screen.getByText(/urn:ngsi-ld:Camera:camera-1/)).toBeTruthy();
    });

    it("Header shows the empty text without an entity", () => {
        const { unmount } = renderPart(<Header />, EntityDetailsProvider, fakeEntityDetailsContext({ entity: null }));
        expect(screen.getByText("No entity selected")).toBeTruthy();
        unmount();
        renderPart(
            <Header emptyText="Pick a row" />,
            EntityDetailsProvider,
            fakeEntityDetailsContext({ entity: null }),
        );
        expect(screen.getByText("Pick a row")).toBeTruthy();
    });

    it("Grid marks stale details", () => {
        const { container } = renderPart(<Grid />, EntityDetailsProvider, fakeEntityDetailsContext({ stale: true }));
        expect(container.querySelector('[data-stale="true"]')).toBeTruthy();
    });

    it("Error shows the error", () => {
        renderPart(<Error />, EntityDetailsProvider, fakeEntityDetailsContext({ error: "Broker down" }));
        expect(screen.getByRole("alert").textContent).toBe("Broker down");
    });
});
