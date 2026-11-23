import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [dts({ tsconfigPath: "./tsconfig.json", outDirs: "dist/types" })],
    build: {
        lib: {
            entry: resolve(import.meta.dirname, "src/index.ts"),
            formats: ["es"],
            fileName: "index",
        },
        rolldownOptions: {
            external: [/^@vela-tools\//, /^zod($|\/)/],
        },
    },
    test: {
        include: ["test/**/*.test.ts"],
    },
});
