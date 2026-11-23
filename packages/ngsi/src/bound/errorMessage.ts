const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export function errorMessage(error: unknown): string {
    if (!(error instanceof Error)) return "The request failed.";
    const { status, title, detail } = error as Error & { status?: unknown; title?: unknown; detail?: unknown };
    if (typeof status !== "number") return error.message || "The request failed.";
    if (status === 0) return "The broker could not be reached.";
    const reason = text(detail) ?? text(title);
    return reason ? `The broker answered ${status}: ${reason}` : `The broker answered ${status}.`;
}
