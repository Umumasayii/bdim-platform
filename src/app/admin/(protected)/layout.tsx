import { Suspense } from "react";
import { requireStaffPage } from "@/lib/auth/viewer";
import { AdminShell } from "@/components/admin/admin-shell";

/*
  This gate renders the admin chrome only for staff. It is NOT the security
  boundary on its own: Next.js renders a layout and its page in parallel, so
  every admin page also calls requireStaffPage() before reading data. Server
  Actions re-check authorisation independently, and in Supabase mode
  row-level security enforces it again in the database.
*/
// Admin pages always wait for an authorisation check, so they are not
// expected to render an instant static shell.
export const instant = false;

async function Gate({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaffPage();
  return (
    <AdminShell viewer={{ name: viewer.name, role: viewer.role, local: viewer.local }}>
      {children}
    </AdminShell>
  );
}

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center text-sm text-muted">Checking access…</div>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
