"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { UserRow } from "@/lib/data/users";
import { enrollUser, setUserRole } from "@/app/actions/admin";
import { Avatar } from "@/components/layout/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { formatDate } from "@/lib/utils";
import { useAdminAction } from "./admin-ui";

export function UsersTable({ users, courses, currentUserId }: { users: UserRow[]; courses: { id: string; title: string }[]; currentUserId: string }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (!role || u.role === role) &&
          (!q.trim() || `${u.fullName} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [users, q, role],
  );
  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <Input id="user-search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="learner">Learners</option>
          <option value="instructor">Instructors</option>
          <option value="admin">Admins</option>
        </Select>
      </div>
      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {filtered.length} of {users.length} users
      </p>
      <ul className="grid gap-3">
        {filtered.map((u) => (
          <UserCard key={u.id} user={u} courses={courses} isSelf={u.id === currentUserId} />
        ))}
      </ul>
    </div>
  );
}

function UserCard({ user, courses, isSelf }: { user: UserRow; courses: { id: string; title: string }[]; isSelf: boolean }) {
  const { run, pending, message } = useAdminAction();
  const [courseId, setCourseId] = useState("");
  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      {message}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar src={user.avatarUrl} name={user.fullName || user.email} className="size-11" />
        <div className="min-w-0 flex-1">
          <Link href={`/admin/users/${user.id}`} className="font-semibold text-navy-950 hover:underline">
            {user.fullName || user.email.split("@")[0]}
          </Link>
          {isSelf ? <span className="ml-2 text-xs text-muted">(you)</span> : null}
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-0.5 text-xs text-muted">
            Joined {formatDate(user.createdAt)}
            {user.lastSignInAt ? ` · last seen ${formatDate(user.lastSignInAt)}` : ""}
            {!user.confirmed ? " · email not confirmed" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="navy">{user.courses} courses</Badge>
          <Badge tone="teal">{user.lessonsDone} lessons done</Badge>
          {user.toGrade ? <Badge tone="amber">{user.toGrade} to grade</Badge> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="text-xs font-medium text-muted" htmlFor={`role-${user.id}`}>
          Role
        </label>
        <Select
          id={`role-${user.id}`}
          className="h-9 w-36"
          value={user.role}
          disabled={pending || isSelf}
          onChange={(e) => {
            const next = e.target.value as UserRow["role"];
            if (next === "admin" && !window.confirm(`Give ${user.email} full administrator access?`)) return;
            run(() => setUserRole(user.id, next));
          }}
        >
          <option value="learner">Learner</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </Select>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
        <label className="text-xs font-medium text-muted" htmlFor={`enroll-${user.id}`}>
          Enroll in
        </label>
        <Select id={`enroll-${user.id}`} className="h-9 max-w-64" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Choose a course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="outline" disabled={!courseId || pending} onClick={() => run(() => enrollUser(user.id, courseId), () => setCourseId(""))}>
          Enroll
        </Button>
        <Link href={`/admin/users/${user.id}`} className="ml-auto text-sm font-semibold text-teal-700 hover:underline">
          View progress →
        </Link>
      </div>
    </li>
  );
}
