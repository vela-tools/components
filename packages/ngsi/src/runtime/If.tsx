import type { ReactNode } from "react";
import { useCapabilities } from "../hooks/useNgsi";
import type { Capabilities } from "./capabilities";

export type CapabilityName = keyof Capabilities;

export type IfProps = {
    capability: CapabilityName | CapabilityName[];
    fallback?: ReactNode;
    children: ReactNode;
};

export function If({ capability, fallback = null, children }: IfProps) {
    const capabilities = useCapabilities();
    const names = Array.isArray(capability) ? capability : [capability];
    return <>{names.every((name) => capabilities[name]) ? children : fallback}</>;
}
