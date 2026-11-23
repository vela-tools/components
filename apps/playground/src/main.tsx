import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "@vela-tools/ui";
import "@mantine/core/styles.css";
import "@vela-tools/ui/styles.css";
import "@vela-tools/ui/fonts";
import { App } from "./App";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MantineProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </MantineProvider>
    </StrictMode>,
);
