"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { getIncidents } from "@/lib/api";
import type { Incident } from "@/lib/types";

function formatDuration(start: number, end?: number) {
  const ms = ((end ?? Date.now() / 1000) - start) * 1000;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export function HistoryView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getIncidents(100).then((data) => {
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  return (
    <PageShell active="history" title="History" subtitle="Incidents and uptime events">
      {loading && <p className="text-zinc-500">Loading incidents…</p>}

      {!loading && incidents.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-500">
          No incidents recorded yet. When a server goes offline, it will appear here.
        </div>
      )}

      <div className="space-y-3">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-wrap justify-between gap-4"
          >
            <div>
              <p className="font-semibold">{inc.server_name}</p>
              <p className="text-zinc-500 text-sm mt-1">{inc.cause}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-zinc-400">
                {new Date(inc.started_at * 1000).toLocaleString()}
              </p>
              <p className={inc.ended_at ? "text-green-400" : "text-red-400"}>
                {inc.ended_at ? `Resolved · ${formatDuration(inc.started_at, inc.ended_at)}` : "Ongoing"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
