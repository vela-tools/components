import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [react(), dts({ tsconfigPath: "./tsconfig.json", outDirs: "dist/types" })],
    build: {
        lib: {
            entry: {
                index: resolve(import.meta.dirname, "src/index.ts"),
                testing: resolve(import.meta.dirname, "src/testing/index.ts"),
                query: resolve(import.meta.dirname, "src/query/index.ts"),
            },
            formats: ["es"],
            fileName: (_format, name) => `${name}.js`,
        },
        rolldownOptions: {
            external: [/^react($|\/)/, /^react-dom($|\/)/, /^@mantine\//, /^@tanstack\//, /^@vela-tools\//],
        },
    },
    test: {
        environment: "jsdom",
        include: ["test/**/*.test.{ts,tsx}"],
        setupFiles: ["./test/setup.ts"],
    },
});
