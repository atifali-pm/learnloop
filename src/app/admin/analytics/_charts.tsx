"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DauPoint, FunnelBucket } from "@/lib/analytics";

export function DauChart({ data }: { data: DauPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid, #e4e4e7)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            fontSize={11}
            stroke="currentColor"
          />
          <YAxis allowDecimals={false} fontSize={11} stroke="currentColor" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            labelStyle={{ color: "#71717a" }}
          />
          <Line
            type="monotone"
            dataKey="activeUsers"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelChart({ data }: { data: FunnelBucket[] }) {
  const shaped = data.map((b) => ({ name: `#${b.order}`, completed: b.completed }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={shaped} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid, #e4e4e7)" />
          <XAxis dataKey="name" fontSize={11} stroke="currentColor" />
          <YAxis allowDecimals={false} fontSize={11} stroke="currentColor" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
