"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { StreamLanguage } from "@codemirror/language";
import { r } from "@codemirror/legacy-modes/mode/r";
import { EditorView } from "@codemirror/view";
import type { LabLanguage } from "@/lib/types";
import { useIsDark } from "@/components/layout/theme-toggle";

const languages = {
  python: () => python(),
  sql: () => sql(),
  r: () => StreamLanguage.define(r),
};

const base = {
  "&": { fontSize: "13.5px", height: "100%" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "12px 0" },
  "&.cm-focused": { outline: "none" },
};
const lightTheme = EditorView.theme({
  ...base,
  ".cm-gutters": { backgroundColor: "#f5f7fa", borderRight: "1px solid #e2e7ee", color: "#7a879b" },
  ".cm-activeLine": { backgroundColor: "rgb(6 147 134 / 0.06)" },
  ".cm-activeLineGutter": { backgroundColor: "rgb(6 147 134 / 0.1)" },
});
const darkTheme = EditorView.theme({
  ...base,
  "&": { ...base["&"], backgroundColor: "#0b1a30" },
  ".cm-gutters": { backgroundColor: "#0c1a30", borderRight: "1px solid #223a5e", color: "#6f86a6" },
  ".cm-activeLine": { backgroundColor: "rgb(85 198 184 / 0.08)" },
  ".cm-activeLineGutter": { backgroundColor: "rgb(85 198 184 / 0.12)" },
}, { dark: true });

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
  const dark = useIsDark();
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height="100%"
      minHeight="320px"
      aria-label={label}
      extensions={[
        languages[language](),
        dark ? darkTheme : lightTheme,
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
      theme={dark ? "dark" : "light"}
      basicSetup={{ highlightActiveLine: true, foldGutter: false, autocompletion: true }}
      className="h-full"
    />
  );
}
