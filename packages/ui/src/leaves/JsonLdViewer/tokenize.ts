export type TokenType = "jsonldKey" | "key" | "string" | "number" | "boolean" | "punctuation" | "uri" | "plain";

export type Token = { text: string; type: TokenType };

const TOKEN_RE =
    /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([:,[\]{}])/g;

const URI_RE = /^(?:https?:\/\/|urn:)/;

export function tokenizeLine(line: string): Token[] {
    const tokens: Token[] = [];
    const re = new RegExp(TOKEN_RE);
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
        if (m.index > lastIndex) tokens.push({ text: line.slice(lastIndex, m.index), type: "plain" });

        if (m[1] !== undefined) {
            tokens.push({ text: m[1], type: m[1].startsWith('"@') ? "jsonldKey" : "key" });
        } else if (m[2] !== undefined) {
            tokens.push({ text: m[2], type: URI_RE.test(m[2].slice(1, -1)) ? "uri" : "string" });
        } else if (m[3] !== undefined) {
            tokens.push({ text: m[3], type: "number" });
        } else if (m[4] !== undefined) {
            tokens.push({ text: m[4], type: "boolean" });
        } else if (m[5] !== undefined) {
            tokens.push({ text: m[5], type: "punctuation" });
        }

        lastIndex = re.lastIndex;
    }

    if (lastIndex < line.length) tokens.push({ text: line.slice(lastIndex), type: "plain" });
    return tokens;
}
