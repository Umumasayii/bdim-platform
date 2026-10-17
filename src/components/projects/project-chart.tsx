"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PortfolioProject } from "@/lib/types";

const palette = ["#159a94", "#102545", "#279853", "#4e76b4"];

export function ProjectChart({ chart }: { chart: PortfolioProject["chart"] }) {
  const common = { data: chart.data, margin: { top: 10, right: 10, left: -10, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid stroke="#e2e7ee" vertical={false} />
      <XAxis dataKey={chart.xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      {chart.series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
    </>
  );
  return (
    <figure>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === "line" ? (
            <LineChart {...common}>
              {axes}
              {chart.series.map((s, i) => (
                <Line key={s.key} dataKey={s.key} name={s.label} stroke={palette[i]} strokeWidth={2.5} strokeDasharray={i ? "5 4" : undefined} />
              ))}
            </LineChart>
          ) : chart.kind === "area" ? (
            <AreaChart {...common}>
              {axes}
              {chart.series.map((s, i) => (
                <Area key={s.key} dataKey={s.key} name={s.label} stroke={palette[i]} fill={palette[i]} fillOpacity={0.15} strokeWidth={2} />
              ))}
            </AreaChart>
          ) : (
            <BarChart {...common}>
              {axes}
              {chart.series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={palette[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-muted">{chart.caption}</figcaption>
    </figure>
  );
}
