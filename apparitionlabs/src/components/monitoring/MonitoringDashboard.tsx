"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Expand, Shrink, Plus, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useMonitoring } from "@/hooks/useMonitoring";
import { updateServerField, openExternalUrl } from "@/lib/api";
import { enabledServerCount } from "@/lib/monitoring-display";
import { overallStatus } from "@/lib/types";
import { SummaryBar } from "./SummaryBar";
import { ServerCard } from "./ServerCard";
import { AccessModal } from "./AccessModal";

type SortKey = "name" | "status" | "latency";
type FilterStatus = "all" | "online" | "offline" | "degraded" | "maintenance";

export default function MonitoringDashboard() {
  const { config, loading: configLoading, persist } = useAppConfig();
  const { displayStatuses, stats, lastUpdated, polling, poll } = useMonitoring(config);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);
  const [accessServerId, setAccessServerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const accessServer = displayStatuses.find((s) => s.id === accessServerId) ?? null;
  const enabledCount = config ? enabledServerCount(config.servers) : 0;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    config?.servers.forEach((s) => s.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [config]);

  const filtered = useMemo(() => {
    let list = [...displayStatuses];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (tagFilter !== "all") {
      list = list.filter((s) => s.tags.includes(tagFilter));
    }
    if (statusFilter !== "all") {
      list = list.filter((s) => overallStatus(s) === statusFilter);
    }
    list.sort((a, b) => {
      if (sort === "latency") return b.latency - a.latency;
      if (sort === "status") return overallStatus(a).localeCompare(overallStatus(b));
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [displayStatuses, search, tagFilter, statusFilter, sort]);

  const setRefreshInterval = async (ms: number) => {
    if (!config) return;
    await persist({ ...config, settings: { ...config.settings, refresh_interval_ms: ms } });
  };

  const handleNotes = async (serverId: string, notes: string) => {
    await updateServerField(serverId, { notes });
    if (config) {
      const servers = config.servers.map((s) =>
        s.id === serverId ? { ...s, notes } : s,
      );
      await persist({ ...config, servers });
    }
  };

  const handleMaintenance = async (serverId: string, current: boolean) => {
    await updateServerField(serverId, { maintenance_mode: !current });
    if (config) {
      const servers = config.servers.map((s) =>
        s.id === serverId ? { ...s, maintenance_mode: !current } : s,
      );
      await persist({ ...config, servers });
      void poll();
    }
  };

  const showLoading =
    configLoading || (enabledCount > 0 && displayStatuses.length === 0 && polling);

  const showNoServersInConfig = !configLoading && enabledCount === 0;

  const showFilteredEmpty =
    !configLoading &&
    enabledCount > 0 &&
    displayStatuses.length > 0 &&
    filtered.length === 0;

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950">
        <span className="text-zinc-400 text-xs">Refresh</span>
        <select
          value={config?.settings.refresh_interval_ms ?? 5000}
          onChange={(e) => void setRefreshInterval(Number(e.target.value))}
          className="bg-transparent text-sm outline-none cursor-pointer"
        >
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
          <option value={60000}>60s</option>
        </select>
      </div>
      <button
        onClick={() => void poll()}
        disabled={polling}
        className="h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center gap-2 text-sm hover:bg-zinc-900 disabled:opacity-50"
      >
        {polling ? <Loader2 size={16} className="animate-spin" /> : null}
        Refresh now
      </button>
      <button
        onClick={() => {
          const next = !expandAll;
          setExpandAll(next);
          setExpanded(next ? Object.fromEntries(filtered.map((s) => [s.id, true])) : {});
        }}
        className="h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center gap-2 text-sm hover:bg-zinc-900"
      >
        {expandAll ? <Shrink size={16} /> : <Expand size={16} />}
        {expandAll ? "Collapse" : "Expand"} all
      </button>
      <Link
        href="/settings"
        className="h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center gap-2 text-sm hover:bg-zinc-900"
      >
        <Plus size={16} /> Add server
      </Link>
    </div>
  );

  return (
    <PageShell
      active="monitoring"
      title="Apparition Labs"
      subtitle="Server Monitoring — Built by Samuel Dingle"
      actions={actions}
    >
      <SummaryBar stats={stats} lastUpdated={lastUpdated} />

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search servers…"
          className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-sm min-w-[200px] focus:outline-none focus:border-zinc-700"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-sm"
        >
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="online">Online</option>
          <option value="degraded">Degraded</option>
          <option value="offline">Offline</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-sm"
        >
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
          <option value="latency">Sort: Latency</option>
        </select>
        {statusFilter !== "all" && (
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className="px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-400 hover:text-white"
          >
            Clear status filter
          </button>
        )}
      </div>

      {showLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
          <Loader2 size={16} className="animate-spin" />
          Loading servers and running health checks…
        </div>
      )}

      {showNoServersInConfig && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center">
          <p className="text-zinc-400 mb-4">No enabled servers in your configuration.</p>
          <Link href="/settings" className="text-white underline text-sm">
            Add a server in Settings
          </Link>
        </div>
      )}

      {showFilteredEmpty && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center mb-6">
          <p className="text-zinc-400 mb-3">
            No servers match the current filters ({displayStatuses.length} server
            {displayStatuses.length === 1 ? "" : "s"} hidden).
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTagFilter("all");
              setStatusFilter("all");
            }}
            className="text-sm text-white underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((s) => (
          <ServerCard
            key={s.id}
            server={s}
            checking={polling && s.layer3 === "skipped" && s.layer2 === "skipped"}
            isExpanded={!!expanded[s.id]}
            ontoggleAction={() => {
              setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }));
              setExpandAll(false);
            }}
            onOpenAccessAction={() => setAccessServerId(s.id)}
            onNotesChangeAction={(notes) => void handleNotes(s.id, notes)}
            onMaintenanceToggleAction={() => void handleMaintenance(s.id, s.maintenance_mode)}
            onTestNowAction={() => void poll()}
            latencyWarningMs={config?.settings.latency_warning_ms ?? 100}
          />
        ))}
      </div>

      {accessServer && (
        <AccessModal
          server={accessServer}
          onCloseAction={() => setAccessServerId(null)}
          onOpenUrlAction={(url) => {
            void openExternalUrl(url);
            setAccessServerId(null);
          }}
          onOpenSSHAction={() => {
            if (accessServer.ssh_host) {
              void openExternalUrl(`ssh://${accessServer.ssh_host}`);
            }
            setAccessServerId(null);
          }}
        />
      )}
    </PageShell>
  );
}
