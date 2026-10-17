/*
  Grant a staff role to an existing account (run by the site owner).
    npx tsx scripts/grant-role.ts someone@example.com admin|instructor
  Uses SUPABASE_SERVICE_ROLE_KEY from .env.local.
*/
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const [email, role = "admin"] = process.argv.slice(2);
if (!email || !["admin", "instructor"].includes(role)) {
  console.error("Usage: tsx scripts/grant-role.ts <email> [admin|instructor]");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  let user;
  for (let page = 1; !user; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (data.users.length < 200) break;
  }
  if (!user) throw new Error(`No account found for ${email}. Sign up on the site first.`);
  console.log(`Account found. Email confirmed: ${user.email_confirmed_at ? "yes" : "NO"}`);
  const { error } = await db.from("staff_roles").upsert({ user_id: user.id, role });
  if (error) throw error;
  console.log(`✓ ${email} is now ${role}.`);
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
