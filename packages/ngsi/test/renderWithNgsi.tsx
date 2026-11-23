import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { NgsiAdapters } from "../src/adapters";
import { NgsiProvider } from "../src/runtime/NgsiProvider";
import { createMockNgsiAdapter, type MockAdapterOptions } from "../src/testing/createMockNgsiAdapter";

export function renderWithNgsi(ui: ReactElement, options: MockAdapterOptions = {}) {
    const adapters: NgsiAdapters = createMockNgsiAdapter(undefined, options);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <MantineProvider>
            <QueryClientProvider client={queryClient}>
                <NgsiProvider broker={{ id: "test", name: "Test" }} adapters={adapters}>
                    {children}
                </NgsiProvider>
            </QueryClientProvider>
        </MantineProvider>
    );
    return { ...render(ui, { wrapper: Wrapper }), adapters, queryClient };
}
