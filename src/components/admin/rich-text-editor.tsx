"use client";

import { useRef, useState } from "react";
import { Bold, Code, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Table } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

/*
  A friendly editor for lesson text. Staff click toolbar buttons instead of
  typing formatting codes; "Preview" shows exactly what learners will see.
  (Content is stored as simple Markdown under the hood.)
*/

type Action = { label: string; icon: typeof Bold; run: (sel: string) => { text: string; select?: [number, number] } };

const wrap = (before: string, after: string, placeholder: string) => (sel: string) => {
  const inner = sel || placeholder;
  return { text: `${before}${inner}${after}`, select: [before.length, before.length + inner.length] as [number, number] };
};
const linePrefix = (prefix: (i: number) => string, placeholder: string) => (sel: string) => {
  const lines = (sel || placeholder).split("\n");
  return { text: lines.map((l, i) => `${prefix(i)}${l.replace(/^(#{1,3} |[-*] |\d+\. |> )/, "")}`).join("\n") };
};

const actions: Action[] = [
  { label: "Heading", icon: Heading2, run: linePrefix(() => "## ", "Section heading") },
  { label: "Sub-heading", icon: Heading3, run: linePrefix(() => "### ", "Sub-heading") },
  { label: "Bold", icon: Bold, run: wrap("**", "**", "bold text") },
  { label: "Italic", icon: Italic, run: wrap("*", "*", "italic text") },
  { label: "Bulleted list", icon: List, run: linePrefix(() => "- ", "List item") },
  { label: "Numbered list", icon: ListOrdered, run: linePrefix((i) => `${i + 1}. `, "First step") },
  { label: "Quote / tip", icon: Quote, run: linePrefix(() => "> ", "A tip or key idea") },
  { label: "Code", icon: Code, run: (sel) => (sel.includes("\n") || !sel ? wrap("```\n", "\n```", "code here")(sel) : wrap("`", "`", "code")(sel)) },
  {
    label: "Link",
    icon: Link2,
    run: (sel) => {
      const url = window.prompt("Link address (https://…)", "https://");
      if (!url) return { text: sel };
      const label = sel || "link text";
      return { text: `[${label}](${url})`, select: [1, 1 + label.length] };
    },
  },
  { label: "Table (as list)", icon: Table, run: () => ({ text: "- **Column A:** value\n- **Column B:** value" }) },
];

export function RichTextEditor({ id, value, onChange, rows = 12 }: { id: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  function apply(action: Action) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = value.slice(a, b);
    const { text, select } = action.run(sel);
    // Block-level actions start on their own line.
    const needsNewline = /^(##|###|- |\d+\. |> |```)/.test(text) && a > 0 && value[a - 1] !== "\n";
    const insert = (needsNewline ? "\n" : "") + text;
    const next = value.slice(0, a) + insert + value.slice(b);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const offset = a + (needsNewline ? 1 : 0);
      if (select) el.setSelectionRange(offset + select[0], offset + select[1]);
      else el.setSelectionRange(offset + text.length, offset + text.length);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface px-2 py-1.5">
        <div role="tablist" aria-label="Editor mode" className="mr-2 flex rounded-lg bg-surface-2 p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded-md px-2.5 py-1 text-xs font-semibold capitalize", tab === t ? "bg-white text-navy-950 shadow-sm" : "text-muted")}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "write"
          ? actions.map((a) => (
              <button
                key={a.label}
                type="button"
                title={a.label}
                aria-label={a.label}
                onClick={() => apply(a)}
                className="grid size-8 place-items-center rounded-md text-navy-800 hover:bg-white"
              >
                <a.icon className="size-4" aria-hidden />
              </button>
            ))
          : null}
      </div>
      {tab === "write" ? (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write the lesson here. Use the toolbar for headings, lists, links and code."
          className="block w-full resize-y bg-white px-4 py-3 text-sm leading-relaxed text-ink outline-none"
        />
      ) : (
        <div className="min-h-48 px-5 py-4">
          {value.trim() ? <Markdown source={value} /> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}
