import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  Minimal, safe Markdown renderer for lesson and solution content.
  Supports: ## / ### headings, paragraphs, - and 1. lists, > quotes,
  ``` fenced code ```, `inline code`, **bold**, *italic*, [links](https://…).
  Builds React elements directly — no raw HTML is ever injected.
*/

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("`")) out.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**")) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("*")) out.push(<em key={key}>{token.slice(1, -1)}</em>);
    else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const href = lm?.[2] ?? "";
      const safe = /^(https?:\/\/|\/|#|mailto:)/.test(href);
      out.push(
        safe ? (
          <a key={key} href={href} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
            {lm?.[1]}
          </a>
        ) : (
          <Fragment key={key}>{lm?.[1]}</Fragment>
        ),
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, "\n").trim().split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;

    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    if (/^###\s/.test(line)) {
      blocks.push(<h3 key={key}>{inline(line.slice(4), key)}</h3>);
      i++;
      continue;
    }
    if (/^##\s/.test(line)) {
      blocks.push(<h2 key={key}>{inline(line.slice(3), key)}</h2>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s/, ""));
      blocks.push(
        <ul key={key}>
          {items.map((t, j) => (
            <li key={j}>{inline(t, `${key}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s/, ""));
      blocks.push(
        <ol key={key}>
          {items.map((t, j) => (
            <li key={j}>{inline(t, `${key}-${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key}>{inline(quote.join(" "), key)}</blockquote>);
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(##|```|>|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(<p key={key}>{inline(para.join(" "), key)}</p>);
  }

  return <div className={cn("prose-bdim", className)}>{blocks}</div>;
}
