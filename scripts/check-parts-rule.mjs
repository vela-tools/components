#!/usr/bin/env node
import { resolve } from "node:path";
import { ESLint } from "eslint";

const root = resolve(import.meta.dirname, "..");
const fixtures = resolve(root, "scripts/fixtures/src/parts");
const RULE = "@typescript-eslint/no-restricted-imports";

const expectations = [
    { file: "BadPart.tsx", flaggedLines: [1, 2, 3, 4, 5, 6, 7] },
    { file: "GoodPart.tsx", flaggedLines: [] },
];

const eslint = new ESLint({ cwd: root, ignore: false });
const results = await eslint.lintFiles(expectations.map((e) => resolve(fixtures, e.file)));

let failed = false;
for (const { file, flaggedLines } of expectations) {
    const result = results.find((r) => r.filePath.endsWith(file));
    const fatal = result.messages.filter((m) => m.fatal);
    const flagged = result.messages.filter((m) => m.ruleId === RULE).map((m) => m.line);
    const others = result.messages.filter((m) => m.ruleId !== RULE && m.severity === 2);
    const missing = flaggedLines.filter((l) => !flagged.includes(l));
    const unexpected = flagged.filter((l) => !flaggedLines.includes(l));

    for (const m of [...fatal, ...others])
        console.error(`${file}:${m.line} ${m.ruleId ?? "parse error"}: ${m.message}`);
    if (missing.length) console.error(`${file}: expected the parts rule to flag lines ${missing.join(", ")}`);
    if (unexpected.length)
        console.error(`${file}: the parts rule flagged allowed imports on lines ${unexpected.join(", ")}`);
    if (fatal.length || others.length || missing.length || unexpected.length) failed = true;
}

if (failed) {
    console.error("parts import rule: failed (see eslint.config.js, the parts/ block)");
    process.exit(1);
}
console.log("parts import rule: ok");
