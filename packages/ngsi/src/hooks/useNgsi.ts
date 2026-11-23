import { useNgsiContext } from "../runtime/ngsiContext";
import type { Capabilities } from "../runtime/capabilities";
import type { NgsiCommands } from "../runtime/commands";

export function useNgsi() {
    const { broker, capabilities } = useNgsiContext();
    return { broker, capabilities };
}

export function useCapabilities(): Capabilities {
    return useNgsiContext().capabilities;
}

export function useNgsiCommands(): NgsiCommands {
    return useNgsiContext().commands;
}
