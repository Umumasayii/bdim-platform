"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { StreamLanguage } from "@codemirror/language";
import { r } from "@codemirror/legacy-modes/mode/r";
import { EditorView } from "@codemirror/view";
import type { LabLanguage } from "@/lib/types";

const languages = {
  python: () => python(),
  sql: () => sql(),
  r: () => StreamLanguage.define(r),
};

const theme = EditorView.theme({
  "&": { fontSize: "13.5px", height: "100%" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "12px 0" },
  ".cm-gutters": { backgroundColor: "#f5f7fa", borderRight: "1px solid #e2e7ee", color: "#7a879b" },
  ".cm-activeLine": { backgroundColor: "rgb(21 154 148 / 0.06)" },
  ".cm-activeLineGutter": { backgroundColor: "rgb(21 154 148 / 0.1)" },
  "&.cm-focused": { outline: "none" },
});

export default function CodeEditor({
  value,
  onChange,
  language,
  label,
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  language: LabLanguage;
  label: string;
  onRun?: () => void;
}) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height="100%"
      minHeight="320px"
      aria-label={label}
      extensions={[
        languages[language](),
        theme,
        EditorView.lineWrapping,
        EditorView.domEventHandlers({
          keydown: (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onRun) {
              e.preventDefault();
              onRun();
              return true;
            }
            return false;
          },
        }),
      ]}
      basicSetup={{ highlightActiveLine: true, foldGutter: false, autocompletion: true }}
      className="h-full"
    />
  );
}
