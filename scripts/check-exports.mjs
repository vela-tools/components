#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const surfaceDir = join(root, "api-surface");
const versionsFile = join(surfaceDir, "versions.json");
const updateAt = process.argv.indexOf("--update");
const update = updateAt !== -1;
// With package names after --update, only those packages are recorded: the others keep the surface of their last release.
const only = update ? process.argv.slice(updateAt + 1).filter((arg) => !arg.startsWith("--")) : [];

function readPackage(pkgDir) {
    return JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
}

function entries(pkg, pkgDir) {
    return Object.entries(pkg.exports ?? {})
        .filter(([, target]) => typeof target === "object" && target.types)
        .map(([subpath, target]) => ({ name: pkg.name, subpath, types: join(pkgDir, target.types) }));
}

function exportNames(file) {
    const program = ts.createProgram([file], { noEmit: true, skipLibCheck: true });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(file);
    const symbol = source && checker.getSymbolAtLocation(source);
    if (!source) throw new Error(`cannot read ${file}`);
    if (!symbol) return [];
    return checker
        .getExportsOfModule(symbol)
        .map((s) => s.getName())
        .sort();
}

function parseVersion(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version ?? "");
    if (!match) throw new Error(`cannot read version ${version}`);
    return match.slice(1, 4).map(Number);
}

function isPrerelease(version) {
    return /^\d+\.\d+\.\d+-/.test(version);
}

function isBreakingBump(from, to) {
    if (isPrerelease(from)) return to !== from;
    const [fMajor, fMinor, fPatch] = parseVersion(from);
    const [tMajor, tMinor, tPatch] = parseVersion(to);
    if (tMajor !== fMajor) return tMajor > fMajor;
    if (fMajor > 0) return false;
    if (tMinor !== fMinor) return tMinor > fMinor;
    if (fMinor > 0) return false;
    return tPatch > fPatch;
}

const fileFor = (e) =>
    join(
        surfaceDir,
        `${e.name.replace("@", "").replace("/", "__")}${e.subpath === "." ? "" : e.subpath.replace("./", ".")}.txt`,
    );

const recorded = existsSync(versionsFile) ? JSON.parse(readFileSync(versionsFile, "utf8")) : {};
const versions = {};
let failed = false;
mkdirSync(surfaceDir, { recursive: true });

const packages = readdirSync(join(root, "packages"))
    .sort()
    .map((dir) => {
        const pkgDir = join(root, "packages", dir);
        return { pkgDir, pkg: readPackage(pkgDir) };
    });
const unknown = only.filter((name) => !packages.some(({ pkg }) => pkg.name === name));
if (unknown.length) throw new Error(`no package named ${unknown.join(", ")}`);

for (const { pkgDir, pkg } of packages) {
    if (only.length && !only.includes(pkg.name)) {
        if (recorded[pkg.name]) versions[pkg.name] = recorded[pkg.name];
        continue;
    }
    versions[pkg.name] = pkg.version;
    const breaking = recorded[pkg.name] ? isBreakingBump(recorded[pkg.name], pkg.version) : true;
    for (const entry of entries(pkg, pkgDir)) {
        if (!existsSync(entry.types)) throw new Error(`${entry.types} is missing: build the packages first`);
        const current = exportNames(entry.types);
        const file = fileFor(entry);
        const label = `${entry.name}${entry.subpath === "." ? "" : entry.subpath.slice(1)}`;
        if (update) {
            writeFileSync(file, current.join("\n") + "\n");
            continue;
        }
        const released = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean) : [];
        const removed = released.filter((n) => !current.includes(n));
        const added = current.filter((n) => !released.includes(n));
        if (added.length) console.log(`${label}: new exports: ${added.join(", ")}`);
        if (removed.length && !breaking) {
            failed = true;
            console.error(
                `${label}: removed ${removed.join(", ")}, but ${pkg.version} is not a breaking bump from ${recorded[pkg.name]}`,
            );
        } else if (removed.length) {
            console.log(
                `${label}: removes ${removed.join(", ")} (breaking bump ${recorded[pkg.name] ?? "none"} -> ${pkg.version})`,
            );
        }
    }
}

if (update) {
    writeFileSync(versionsFile, JSON.stringify(versions, null, 2) + "\n");
    console.log("api-surface/ updated");
} else if (failed) process.exit(1);
else console.log("public surface: ok");
