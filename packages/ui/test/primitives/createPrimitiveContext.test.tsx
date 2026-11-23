import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderPart } from "../renderPart";
import { createPrimitiveContext } from "../../src/primitives/createPrimitiveContext";

type DemoContextValue = { label: string; count: number };

const [DemoProvider, useDemoContext] = createPrimitiveContext<DemoContextValue>("Demo");

function Label() {
    const { label, count } = useDemoContext("Label");
    return (
        <span>
            {label}: {count}
        </span>
    );
}

describe("createPrimitiveContext", () => {
    it("gives parts the value provided by the Root", () => {
        renderPart(<Label />, DemoProvider, { label: "Items", count: 3 });
        expect(screen.getByText("Items: 3")).toBeTruthy();
    });

    it("gives each part the value of its nearest Root", () => {
        render(
            <DemoProvider value={{ label: "Outer", count: 1 }}>
                <Label />
                <DemoProvider value={{ label: "Inner", count: 2 }}>
                    <Label />
                </DemoProvider>
            </DemoProvider>,
        );
        expect(screen.getByText("Outer: 1")).toBeTruthy();
        expect(screen.getByText("Inner: 2")).toBeTruthy();
    });

    it("throws an error naming the family and the part outside a Root", () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Label />)).toThrow("<Demo.Label> must be used inside a Demo Root.");
        consoleError.mockRestore();
    });

    it("names the context after the family", () => {
        expect((DemoProvider as { displayName?: string }).displayName).toBe("DemoContext");
    });
});
