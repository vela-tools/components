import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ["react", "react-dom", "react/jsx-runtime", "@mantine/core", "@mantine/hooks", "@tanstack/react-query"],
    },
    server: {
        port: 2370,
    },
});
