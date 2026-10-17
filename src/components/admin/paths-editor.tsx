"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { LearningPath } from "@/lib/types";
import { deletePath, savePath } from "@/app/actions/admin";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { lines, toLines, useAdminAction } from "./admin-ui";

function PathForm({ path, courses, onDone }: { path: LearningPath; courses: { slug: string; title: string }[]; onDone?: () => void }) {
  const [p, setP] = useState(path);
  const { run, pending, message } = useAdminAction();
  const set = <K extends keyof LearningPath>(k: K, v: LearningPath[K]) => setP((x) => ({ ...x, [k]: v }));
  const id = p.id || "new";
  return (
    <div className="grid gap-4">
      {message}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Title" htmlFor={`${id}-t`}>
          <Input id={`${id}-t`} value={p.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Level" htmlFor={`${id}-l`}>
          <Select id={`${id}-l`} value={p.level} onChange={(e) => set("level", e.target.value as LearningPath["level"])}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </Select>
        </Field>
        <Field label="Estimated duration" htmlFor={`${id}-d`}>
          <Input id={`${id}-d`} value={p.estimatedDuration} onChange={(e) => set("estimatedDuration", e.target.value)} />
        </Field>
      </div>
      <Field label="Summary" htmlFor={`${id}-s`}>
        <Textarea id={`${id}-s`} rows={2} value={p.summary} onChange={(e) => set("summary", e.target.value)} />
      </Field>
      <Field label="Audience" htmlFor={`${id}-a`}>
        <Input id={`${id}-a`} value={p.audience} onChange={(e) => set("audience", e.target.value)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Prerequisites (one per line)" htmlFor={`${id}-p`}>
          <Textarea id={`${id}-p`} rows={3} value={lines(p.prerequisites)} onChange={(e) => set("prerequisites", toLines(e.target.value))} />
        </Field>
        <Field label="Objectives (one per line)" htmlFor={`${id}-o`}>
          <Textarea id={`${id}-o`} rows={3} value={lines(p.objectives)} onChange={(e) => set("objectives", toLines(e.target.value))} />
        </Field>
        <Field label="Assignments (one per line)" htmlFor={`${id}-as`}>
          <Textarea id={`${id}-as`} rows={3} value={lines(p.assignments)} onChange={(e) => set("assignments", toLines(e.target.value))} />
        </Field>
      </div>
      <Field label="Courses in order (one slug per line)" htmlFor={`${id}-c`} hint={`Available: ${courses.map((c) => c.slug).join(", ")}`}>
        <Textarea id={`${id}-c`} rows={4} className="font-mono text-xs" value={lines(p.courseSlugs)} onChange={(e) => set("courseSlugs", toLines(e.target.value))} />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-teal-600" checked={p.published} onChange={(e) => set("published", e.target.checked)} /> Published
        </label>
        <Field label="Sort order" htmlFor={`${id}-o2`} className="w-28">
          <Input id={`${id}-o2`} type="number" value={p.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </Field>
        <div className="ml-auto flex gap-2">
          {path.id ? (
            <Button variant="ghost" onClick={() => window.confirm("Delete this path?") && run(() => deletePath(path.id))}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          ) : null}
          <Button
            variant="teal"
            disabled={pending}
            onClick={() => {
              const slug = p.slug || slugify(p.title);
              run(() => savePath({ ...p, slug, id: p.id || slug }), onDone);
            }}
          >
            Save path
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PathsEditor({ paths, courses }: { paths: LearningPath[]; courses: { slug: string; title: string }[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-4">
      {paths.map((p) => (
        <details key={p.id} className="rounded-2xl border border-line bg-white">
          <summary className="flex cursor-pointer items-center justify-between gap-2 px-5 py-4">
            <span className="font-semibold text-navy-950">{p.title}</span>
            <span className="flex gap-2">
              <Badge>{p.level}</Badge>
              {p.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
            </span>
          </summary>
          <div className="border-t border-line p-5">
            <PathForm path={p} courses={courses} />
          </div>
        </details>
      ))}
      {adding ? (
        <div className="rounded-2xl border border-teal-200 bg-white p-5">
          <PathForm
            path={{ id: "", slug: "", title: "", level: "Beginner", summary: "", audience: "", prerequisites: [], objectives: [], courseSlugs: [], assignments: [], estimatedDuration: "", published: false, sortOrder: paths.length + 1 }}
            courses={courses}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : (
        <div>
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> New learning path
          </Button>
        </div>
      )}
    </div>
  );
}
