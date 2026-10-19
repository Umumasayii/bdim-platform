import { requireStaff } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { listUsers } from "@/lib/data/users";
import { genderLabel } from "@/lib/profile-options";

/** One CSV cell: quoted, with formula-looking values neutralised so Excel never runs them. */
function cell(value: string | number) {
  let v = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

/** Every member as a spreadsheet (admins only). */
export async function GET() {
  try {
    await requireStaff({ adminOnly: true });
  } catch {
    return new Response("Administrator access is required.", { status: 403 });
  }
  if (!isSupabaseConfigured) return new Response("User accounts are not configured.", { status: 404 });

  const users = await listUsers();
  const header = ["Name", "Email", "Role", "Gender", "Country", "Province / region", "District / city", "Occupation", "Organization", "Interests", "Phone", "Courses", "Lessons done", "Joined", "Last seen", "Email confirmed"];
  const lines = users.map((u) =>
    [
      u.fullName,
      u.email,
      u.role,
      u.gender ? genderLabel(u.gender) : "",
      u.country,
      u.province,
      u.city,
      u.occupation,
      u.organization,
      u.interests.join("; "),
      u.phone,
      u.courses,
      u.lessonsDone,
      u.createdAt.slice(0, 10),
      (u.lastSeenAt || u.lastSignInAt || "").slice(0, 10),
      u.confirmed ? "yes" : "no",
    ]
      .map(cell)
      .join(","),
  );
  // Leading BOM so Excel reads UTF-8 (accents in names) correctly.
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bdim-members-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
