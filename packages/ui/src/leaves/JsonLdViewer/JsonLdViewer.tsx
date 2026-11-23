import { useMemo } from "react";
import { ScrollArea, Text } from "@mantine/core";
import clsx from "clsx";
import classes from "./JsonLdViewer.module.css";
import type { JsonLdViewerProps } from "./JsonLdViewer.types";
import { tokenizeLine, type TokenType } from "./tokenize";

const TOKEN_COLOR: Record<TokenType, string> = {
    jsonldKey: "var(--token-jsonld)",
    key: "var(--token-key)",
    string: "var(--token-string)",
    number: "var(--token-number)",
    boolean: "var(--token-boolean)",
    punctuation: "var(--token-punctuation)",
    uri: "var(--token-uri)",
    plain: "var(--token-plain)",
};

export function JsonLdViewer({ data, emptyText = "// no entity selected", className, style }: JsonLdViewerProps) {
    const lines = useMemo(() => (data == null ? [] : JSON.stringify(data, null, 2).split("\n")), [data]);

    if (data == null) {
        return (
            <div className={clsx(classes.empty, className)} style={style}>
                <Text size="xs" c="dimmed" ff="monospace">
                    {emptyText}
                </Text>
            </div>
        );
    }

    return (
        <ScrollArea className={clsx(classes.root, className)} style={style} scrollbarSize={5}>
            {lines.map((line, i) => (
                <div key={i} className={classes.line}>
                    <span className={classes.lineNumber}>{i + 1}</span>
                    <span className={classes.lineContent}>
                        {tokenizeLine(line).map((tok, j) => (
                            <span key={j} style={{ color: TOKEN_COLOR[tok.type] }}>
                                {tok.text}
                            </span>
                        ))}
                    </span>
                </div>
            ))}
        </ScrollArea>
    );
}
