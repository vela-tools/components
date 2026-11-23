export function lightenColor(hex: string, percent: number = 50): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * (percent / 100)));
    return `#${((1 << 24) + (lighten(r) << 16) + (lighten(g) << 8) + lighten(b)).toString(16).slice(1)}`;
}

function hslToHex(h: number, s: number, l: number): string {
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;
    const [r, g, b] =
        h < 60
            ? [c, x, 0]
            : h < 120
              ? [x, c, 0]
              : h < 180
                ? [0, c, x]
                : h < 240
                  ? [0, x, c]
                  : h < 300
                    ? [x, 0, c]
                    : [c, 0, x];
    const toHex = (n: number) =>
        Math.round((n + m) * 255)
            .toString(16)
            .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateTypeColors(types: string[]): Record<string, string> {
    const colors: Record<string, string> = {};
    types.forEach((type, i) => {
        colors[type] = hslToHex((i * 137.5) % 360, 100, 40);
    });
    return colors;
}
