import { screen, within } from "@testing-library/react";
import type { NgsiCommands } from "../src/runtime/commands";
import type { SelectionState } from "../src/runtime/store";

export const CA01 = "urn:ngsi-ld:Camera:camera-1";
export const CA02 = "urn:ngsi-ld:Camera:camera-2";

export const probe: { selection?: SelectionState; commands?: NgsiCommands } = {};

export const selection = () => probe.selection!;

export const runtimeCommands = () => probe.commands!;

export const picker = (label: string) => within(screen.getByRole("region", { name: label }));

export const item = (label: string, name: string) => picker(label).getByRole("button", { name }) as HTMLButtonElement;

export const pressed = (label: string, name: string) => item(label, name).getAttribute("aria-pressed") === "true";
