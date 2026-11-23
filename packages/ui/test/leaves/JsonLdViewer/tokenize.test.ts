import { describe, expect, it } from "vitest";
import { tokenizeLine } from "../../../src/leaves/JsonLdViewer/tokenize";

const types = (line: string) =>
    tokenizeLine(line)
        .filter((t) => t.type !== "plain")
        .map((t) => [t.type, t.text]);

describe("tokenizeLine", () => {
    it("marks JSON-LD keys, keys and URIs", () => {
        expect(types('  "@context": "https://example.invalid/ctx",')).toEqual([
            ["jsonldKey", '"@context"'],
            ["punctuation", ":"],
            ["uri", '"https://example.invalid/ctx"'],
            ["punctuation", ","],
        ]);
        expect(types('"id": "urn:ngsi-ld:Camera:1"')[2]).toEqual(["uri", '"urn:ngsi-ld:Camera:1"']);
    });

    it("marks strings, numbers and literals", () => {
        expect(types('"a": "x", "b": -1.5e3, "c": true, "d": null')).toEqual([
            ["key", '"a"'],
            ["punctuation", ":"],
            ["string", '"x"'],
            ["punctuation", ","],
            ["key", '"b"'],
            ["punctuation", ":"],
            ["number", "-1.5e3"],
            ["punctuation", ","],
            ["key", '"c"'],
            ["punctuation", ":"],
            ["boolean", "true"],
            ["punctuation", ","],
            ["key", '"d"'],
            ["punctuation", ":"],
            ["boolean", "null"],
        ]);
    });

    it("keeps the whole line, whitespace included", () => {
        const line = '    "value": 42';
        expect(
            tokenizeLine(line)
                .map((t) => t.text)
                .join(""),
        ).toBe(line);
    });
});
