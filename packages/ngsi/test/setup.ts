window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
})) as typeof window.matchMedia;

if (!("fonts" in document)) {
    Object.defineProperty(document, "fonts", {
        value: { addEventListener: () => {}, removeEventListener: () => {}, ready: Promise.resolve() },
    });
}

globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;
