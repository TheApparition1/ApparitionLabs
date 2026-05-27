"use client";

import type { DashboardStats } from "@/lib/types";

export function SummaryBar({ stats, lastUpdated }: { stats: DashboardStats | null; lastUpdated: number | null }) {
  if (!stats) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Chip label={`${stats.online}/${stats.total} online`} tone="green" />
      {stats.degraded > 0 && <Chip label={`${stats.degraded} degraded`} tone="yellow" />}
      {stats.offline > 0 && <Chip label={`${stats.offline} offline`} tone="red" />}
      {stats.maintenance > 0 && <Chip label={`${stats.maintenance} maintenance`} tone="yellow" />}
      <Chip label={`avg ${stats.avg_latency_ms}ms`} tone="neutral" />
      <Chip label={`${stats.incidents_today} incidents today`} tone="neutral" />
      {lastUpdated && (
        <span className="text-zinc-600 text-xs ml-auto">
          Last update {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "green" | "yellow" | "red" | "neutral" }) {
  const colors = {
    green: "border-green-500/30 text-green-400 bg-green-500/10",
    yellow: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
    red: "border-red-500/30 text-red-400 bg-red-500/10",
    neutral: "border-zinc-700 text-zinc-400 bg-zinc-900",
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full border ${colors[tone]}`}>{label}</span>
  );
}
