import type { QueryObserverResult } from "@tanstack/react-query";
import type { ConnectionStatus } from "@vela-tools/ui";
import { errorMessage } from "../bound/errorMessage";

export type ConnectionState = { status: ConnectionStatus; error?: string };

export function connectionStatusOf(
    query: Pick<QueryObserverResult, "status" | "fetchStatus" | "error">,
): ConnectionState {
    switch (query.status) {
        case "pending":
            return { status: "connecting" };
        case "success":
            return { status: "connected" };
        case "error":
            if (query.fetchStatus === "fetching") return { status: "connecting" };
            if (query.error?.name === "NgsiValidationError") return { status: "connected", error: query.error.message };
            return { status: "error", error: errorMessage(query.error) };
    }
}
