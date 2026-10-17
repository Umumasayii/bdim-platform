import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { createUserClient } from "@/lib/supabase/server";
import type { Role, Viewer } from "@/lib/types";
import { LOCAL_ADMIN_COOKIE, verifyLocalAdminToken } from "./local-admin";

/** The current signed-in person, or null. Reads cookies, so call it inside <Suspense> or a Server Action. */
export async function getViewer(): Promise<Viewer | null> {
  await connection();
  if (isSupabaseConfigured) {
    const supabase = await createUserClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const [{ data: role }, { data: profile }] = await Promise.all([
      supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);
    return {
      id: user.id,
      email: user.email ?? "",
      name: (profile?.full_name as string) || user.email || "Learner",
      role: ((role?.role as Role | undefined) ?? "learner"),
      local: false,
    };
  }
  const token = (await cookies()).get(LOCAL_ADMIN_COOKIE)?.value;
  if (verifyLocalAdminToken(token, Date.now())) {
    return { id: "local-admin", email: "", name: "Local administrator", role: "admin", local: true };
  }
  return null;
}

export const isStaffRole = (role: Role) => role === "admin" || role === "instructor";

/** Authorise a Server Action or protected page. Throws for non-staff. */
export async function requireStaff(options: { adminOnly?: boolean } = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || !isStaffRole(viewer.role) || (options.adminOnly && viewer.role !== "admin")) {
    throw new Error("Not authorised.");
  }
  return viewer;
}

/** For admin pages: redirect to sign-in instead of throwing. */
export async function requireStaffPage(options: { adminOnly?: boolean } = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(isSupabaseConfigured ? "/sign-in?next=/admin" : "/admin/login");
  if (!isStaffRole(viewer.role) || (options.adminOnly && viewer.role !== "admin")) redirect("/admin/forbidden");
  return viewer;
}
