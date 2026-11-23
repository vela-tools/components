import { useEffect, type ReactNode } from "react";
import { ItemPicker } from "@vela-tools/ui";
import { useNgsiCommands } from "../src/hooks/useNgsi";
import { useSelection } from "../src/hooks/useNgsiSelector";
import { probe } from "./listRoots";

export function Picker({ label, children }: { label: string; children: (parts: ReactNode) => ReactNode }) {
    return (
        <section aria-label={label}>
            {children(
                <>
                    <ItemPicker.Error />
                    <ItemPicker.Empty />
                    <ItemPicker.List />
                </>,
            )}
        </section>
    );
}

export function SelectionProbe() {
    const selection = useSelection();
    useEffect(() => {
        probe.selection = selection;
    }, [selection]);
    return null;
}

export function CommandsProbe() {
    const commands = useNgsiCommands();
    useEffect(() => {
        probe.commands = commands;
    }, [commands]);
    return null;
}
