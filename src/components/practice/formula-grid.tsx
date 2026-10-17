import type { FormulaGrid as Grid } from "@/lib/types";
import { formatCell } from "@/lib/formula/engine";

export function FormulaGridView({ grid, caption }: { grid: Grid; caption?: string }) {
  const rowNums = Array.from({ length: grid.rows }, (_, i) => i + 1);
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="bg-surface-2 text-xs text-muted">
            <th scope="col" className="w-10 border-b border-r border-line px-2 py-1.5 font-medium" aria-label="Row" />
            {grid.columns.map((c) => (
              <th key={c} scope="col" className="border-b border-r border-line px-3 py-1.5 text-left font-medium last:border-r-0">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowNums.map((r) => (
            <tr key={r} className={r === 1 ? "bg-navy-50/60 font-semibold text-navy-900" : "bg-white"}>
              <th scope="row" className="border-b border-r border-line bg-surface-2 px-2 py-1.5 text-center text-xs font-medium text-muted">
                {r}
              </th>
              {grid.columns.map((c) => {
                const v = grid.cells[`${c}${r}`] ?? null;
                return (
                  <td
                    key={c}
                    className={`border-b border-r border-line px-3 py-1.5 last:border-r-0 ${typeof v === "number" ? "text-right font-mono tabular-nums" : ""}`}
                  >
                    {formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
