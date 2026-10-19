import Link from "next/link";
import { connection } from "next/server";
import { Download } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { listUsers, userStats } from "@/lib/data/users";
import { currentTimeMs, cn } from "@/lib/utils";
import { Notice } from "@/components/ui/notice";
import { Breakdown, StatTiles, WeeklyBars } from "@/components/admin/people-stats";
import { PeopleDirectory } from "@/components/admin/people-directory";

export const metadata = { title: "People" };

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "location", label: "Location" },
  { id: "demographics", label: "Gender & occupation" },
  { id: "interests", label: "Interests & organizations" },
  { id: "activity", label: "Activity" },
  { id: "directory", label: "Directory" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function PeoplePage({ searchParams }: PageProps<"/admin/people">) {
  await connection();
  await requireStaffPage({ adminOnly: true });
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-navy-950">People</h1>
        <Notice tone="info">People statistics need user accounts (Supabase).</Notice>
      </div>
    );
  }
  const requested = (await searchParams).tab;
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : "overview";
  const users = await listUsers();
  const s = userStats(users, currentTimeMs());
  const pct = (n: number) => (s.total ? `${Math.round((100 * n) / s.total)}%` : "0%");

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy-950">People</h1>
          <p className="mt-1 text-muted">Who your members are, where they are, what they want to learn and how active they are.</p>
        </div>
        <a
          href="/admin/people/export"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-navy-900 hover:border-teal-400"
        >
          <Download className="size-4" aria-hidden /> Download CSV (Excel)
        </a>
      </div>

      <nav aria-label="People sections" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max gap-1 px-1">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={t.id === "overview" ? "/admin/people" : `/admin/people?tab=${t.id}`}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium",
                  tab === t.id ? "bg-navy-800 text-white" : "text-navy-900 hover:bg-surface",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" ? (
        <>
          <StatTiles
            tiles={[
              { label: "Total members", value: s.total, sub: `${s.confirmed} confirmed their email` },
              { label: "New this week", value: s.newLast7Days, sub: `${s.newLast30Days} in the last 30 days` },
              { label: "Active this week", value: s.activeLast7Days, sub: `${s.activeLast30Days} in the last 30 days` },
              { label: "Complete profiles", value: pct(s.completeProfiles), sub: `${s.completeProfiles} gave gender, location and interests` },
            ]}
          />
          <StatTiles
            tiles={[
              { label: "Learners", value: s.roles.learner },
              { label: "Instructors", value: s.roles.instructor },
              { label: "Admins", value: s.roles.admin },
              { label: "Countries", value: s.countries.filter((c) => c.label !== "Not given").length },
            ]}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Breakdown title="Gender" rows={s.gender} total={s.total} />
            <Breakdown title="Top countries" rows={s.countries} total={s.total} limit={6} />
            <Breakdown title="Top interests" rows={s.interests} total={s.total} limit={6} />
            <Breakdown title="Occupation" rows={s.occupations} total={s.total} limit={6} />
          </div>
          <WeeklyBars rows={s.signupsByWeek} />
        </>
      ) : null}

      {tab === "location" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Breakdown title="Countries" rows={s.countries} total={s.total} limit={30} />
          <Breakdown title="Provinces / counties / regions / states" rows={s.provinces} total={s.total} limit={30} empty="No provinces given yet." />
          <div className="md:col-span-2">
            <Breakdown title="Districts / cities" rows={s.districts} total={s.total} limit={60} empty="No districts or cities given yet." />
          </div>
        </div>
      ) : null}

      {tab === "demographics" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Breakdown title="Gender" rows={s.gender} total={s.total} />
          <Breakdown title="Occupation" rows={s.occupations} total={s.total} limit={20} />
        </div>
      ) : null}

      {tab === "interests" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Breakdown title="What members want to learn" rows={s.interests} total={s.total} limit={20} empty="No interests given yet." />
          <Breakdown title="Organizations and schools" rows={s.organizations} total={s.total} limit={40} empty="No organizations given yet." />
        </div>
      ) : null}

      {tab === "activity" ? (
        <>
          <StatTiles
            tiles={[
              { label: "Active in the last 7 days", value: s.activeLast7Days, sub: pct(s.activeLast7Days) + " of members" },
              { label: "Active in the last 30 days", value: s.activeLast30Days, sub: pct(s.activeLast30Days) + " of members" },
              { label: "Joined in the last 30 days", value: s.newLast30Days },
              { label: "Email not confirmed", value: s.total - s.confirmed },
            ]}
          />
          <WeeklyBars rows={s.signupsByWeek} />
        </>
      ) : null}

      {tab === "directory" ? (
        <PeopleDirectory
          rows={users.map((u) => ({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            gender: u.gender,
            country: u.country,
            province: u.province,
            city: u.city,
            organization: u.organization,
            occupation: u.occupation,
            interests: u.interests,
            phone: u.phone,
            createdAt: u.createdAt,
            lastSeenAt: u.lastSeenAt,
            lastSignInAt: u.lastSignInAt,
          }))}
        />
      ) : null}
    </div>
  );
}
