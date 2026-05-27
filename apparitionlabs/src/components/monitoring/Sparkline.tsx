"use client";

import type { LatencyPoint } from "@/lib/types";

export function Sparkline({ points }: { points: LatencyPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="h-8 flex items-center text-zinc-600 text-xs">No history yet</div>
    );
  }

  const max = Math.max(...points.map((p) => p.latency_ms), 1);
  const width = 120;
  const height = 32;
  const step = width / (points.length - 1);

  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - (p.latency_ms / max) * height;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="text-green-400/80">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
