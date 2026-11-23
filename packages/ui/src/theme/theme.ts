import { createTheme, rem } from "@mantine/core";

export const theme = createTheme({
    primaryColor: "violet",
    primaryShade: { light: 6, dark: 5 },
    defaultRadius: "sm",
    fontFamily: "'Geist Variable', system-ui, sans-serif",
    fontFamilyMonospace: "'Geist Mono Variable', monospace",

    colors: {
        violet: [
            "#F5F0FF",
            "#EDE4FE",
            "#c4b5fd",
            "#a78bfa",
            "#8B5CF6",
            "#A970F5",
            "#7C3AED",
            "#6D28D9",
            "#4C1D95",
            "#2E1065",
        ],
        success: [
            "#dcfce7",
            "#bbf7d0",
            "#86efac",
            "#4ade80",
            "#22c55e",
            "#16a34a",
            "#15803d",
            "#166534",
            "#14532d",
            "#052e16",
        ],
        warning: [
            "#fef3c7",
            "#fde68a",
            "#fcd34d",
            "#fbbf24",
            "#f59e0b",
            "#d97706",
            "#b45309",
            "#92400e",
            "#78350f",
            "#451a03",
        ],
        danger: [
            "#fee2e2",
            "#fecaca",
            "#fca5a5",
            "#f87171",
            "#ef4444",
            "#dc2626",
            "#b91c1c",
            "#991b1b",
            "#7f1d1d",
            "#450a0a",
        ],
        info: [
            "#dbeafe",
            "#bfdbfe",
            "#93c5fd",
            "#60a5fa",
            "#3b82f6",
            "#2563eb",
            "#1d4ed8",
            "#1e40af",
            "#1e3a8a",
            "#172554",
        ],
    },

    fontSizes: {
        xs: rem(10),
        sm: rem(11),
        md: rem(13),
        lg: rem(16),
        xl: rem(18),
    },

    spacing: {
        xs: rem(4),
        sm: rem(8),
        md: rem(12),
        lg: rem(16),
        xl: rem(24),
    },

    radius: {
        xs: rem(3),
        sm: rem(6),
        md: rem(8),
        lg: rem(10),
        xl: rem(16),
    },

    headings: {
        fontWeight: "600",
    },

    shadows: {
        sm: "0 1px 3px rgba(0,0,0,.08)",
        md: "0 4px 16px rgba(0,0,0,.12)",
        lg: "0 8px 32px rgba(0,0,0,.16)",
    },
});
