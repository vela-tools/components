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
                fonts: resolve(import.meta.dirname, "src/fonts.ts"),
            },
            formats: ["es"],
            fileName: (_format, name) => `${name}.js`,
            cssFileName: "index",
        },
        rolldownOptions: {
            external: [
                /^@fontsource-variable\//,
                /^react($|\/)/,
                /^react-dom($|\/)/,
                /^@mantine\//,
                /^@phosphor-icons\//,
                "clsx",
                /^tabulator-tables($|\/(?!.*\.css$))/,
            ],
        },
    },
    test: {
        environment: "jsdom",
        include: ["test/**/*.test.{ts,tsx}"],
        setupFiles: ["./test/setup.ts"],
    },
});
