import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["**/dist", "**/node_modules", "**/.turbo", "scripts/fixtures"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        },
    },
    {
        files: ["**/src/**/parts/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": "off",
            "@typescript-eslint/no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "^\\.{1,2}/(.*/)?(runtime|hooks|bound)(/|$)",
                            message: "Parts read only their context contract. Move data access to a Root.",
                        },
                        {
                            group: ["@tanstack/react-query", "@tanstack/react-query/*"],
                            message: "Parts read only their context contract. Move data access to a Root.",
                        },
                        {
                            group: ["@vela-tools/ngsi", "@vela-tools/ngsi/*"],
                            allowTypeImports: true,
                            message: "Parts may import only types from @vela-tools/ngsi.",
                        },
                    ],
                },
            ],
        },
    },
);
