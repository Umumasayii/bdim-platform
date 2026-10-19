import type { Tally } from "@/lib/data/users";

/** Horizontal bars: label, count and share of `total`. */
export function Breakdown({ title, rows, total, limit = 10, empty = "No answers yet." }: { title: string; rows: Tally; total: number; limit?: number; empty?: string }) {
  const shown = rows.slice(0, limit);
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-semibold text-navy-950">{title}</h3>
      {shown.length ? (
        <ul className="mt-3 grid gap-2">
          {shown.map((r) => {
            const pct = total ? Math.round((100 * r.count) / total) : 0;
            return (
              <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                <span className="truncate text-navy-900" title={r.label}>
                  {r.label}
                </span>
                <span className="tabular-nums text-muted">
                  {r.count} <span className="text-xs">({pct}%)</span>
                </span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-teal-600" style={{ width: `${Math.max(pct, r.count ? 3 : 0)}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
      {rows.length > limit ? <p className="mt-3 text-xs text-muted">+ {rows.length - limit} more</p> : null}
    </section>
  );
}

/** Big number tiles. */
export function StatTiles({ tiles }: { tiles: { label: string; value: number | string; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs text-muted">{t.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-navy-950 sm:text-3xl">{t.value}</p>
          {t.sub ? <p className="mt-0.5 text-xs text-muted">{t.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

/** Vertical bars for sign-ups per week. */
export function WeeklyBars({ rows }: { rows: Tally }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const short = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-semibold text-navy-950">New members per week</h3>
      <p className="text-xs text-muted">Last {rows.length} weeks (weeks start on Monday)</p>
      <div className="mt-4 overflow-x-auto">
        <ol className="flex h-40 min-w-[30rem] items-end gap-1.5">
          {rows.map((r) => (
            <li key={r.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Week of ${short(r.label)}: ${r.count}`}>
              <span className="text-[11px] tabular-nums text-muted">{r.count || ""}</span>
              <span className="w-full rounded-t-md bg-teal-600" style={{ height: `${(100 * r.count) / max}%`, minHeight: r.count ? 4 : 1 }} />
              <span className="whitespace-nowrap text-[10px] text-muted">{short(r.label)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
