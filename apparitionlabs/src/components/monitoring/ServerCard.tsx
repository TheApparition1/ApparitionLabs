"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  RefreshCw,
  Settings,
} from "lucide-react";
import type { ServerStatus } from "@/lib/types";
import { layerLabel, layerOk, overallStatus, statusStyle } from "@/lib/types";
import { getLatencyHistory, getServerUptime } from "@/lib/api";
import { Sparkline } from "./Sparkline";

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
        <span className={ok ? "text-green-400" : "text-red-400"}>{value}</span>
      </div>
    </div>
  );
}


export function ServerCard({
  server,
  checking = false,
  isExpanded,
  ontoggleAction,
  onOpenAccessAction,
  onNotesChangeAction,
  onMaintenanceToggleAction,
  onTestNowAction,
  latencyWarningMs,
}: {
  server: ServerStatus;
  checking?: boolean;
  isExpanded: boolean;
  ontoggleAction: () => void;
  onOpenAccessAction: () => void;
  onNotesChangeAction: (notes: string) => void;
  onMaintenanceToggleAction: () => void;
  onTestNowAction: () => void;
  latencyWarningMs: number;
}) {
  const status = checking
    ? { color: "text-zinc-400", glow: "none", label: "CHECKING…" }
    : statusStyle(overallStatus(server));
  const [history, setHistory] = useState<{ timestamp: number; latency_ms: number }[]>([]);
  const [uptime24h, setUptime24h] = useState(100);

  useEffect(() => {
    void getLatencyHistory(server.id, 1).then(setHistory);
    void getServerUptime(server.id, 24).then(setUptime24h);
  }, [server.id, server.latency]);

  const hasAccess = !!(server.public_url || server.local_url || server.ssh_host);
  const warnMs = latencyWarningMs;

  return (
    <div
      className="rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl overflow-hidden hover:border-zinc-700 transition"
      style={{ boxShadow: status.glow }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold truncate">{server.name}</h2>
            <p className={`mt-2 text-xs font-medium tracking-widest ${status.color}`}>
              {status.label}
            </p>
            {server.failure_reason && overallStatus(server) !== "online" && (
              <p className="text-zinc-500 text-xs mt-1">{server.failure_reason}</p>
            )}
            {server.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {server.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onTestNowAction}
              className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"
              title="Test now"
            >
              <RefreshCw size={14} />
            </button>
            {hasAccess && (
              <button
                onClick={onOpenAccessAction}
                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"
                title="Access"
              >
                <ExternalLink size={16} />
              </button>
            )}
            <Link
              href={`/settings?edit=${server.id}`}
              className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"
              title="Edit"
            >
              <Settings size={14} />
            </Link>
            <button
              onClick={ontoggleAction}
              className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Sparkline points={history} />
          <span className="text-zinc-600 text-xs">{uptime24h.toFixed(1)}% uptime 24h</span>
        </div>

        <div className="mt-4 space-y-2">
          <StatusRow
            label={server.layer1_label}
            value={layerLabel(server.layer1, "Online")}
            ok={layerOk(server.layer1)}
          />
          <StatusRow
            label="Tunnel / Access"
            value={layerLabel(server.layer2, "Healthy")}
            ok={layerOk(server.layer2)}
          />
          <StatusRow
            label="Server Health"
            value={layerLabel(server.layer3, "Healthy")}
            ok={layerOk(server.layer3)}
          />
          <StatusRow
            label="Latency"
            value={`${server.latency}ms`}
            ok={server.latency < warnMs}
          />
        </div>
      </div>

      <div
        className={`transition-all duration-300 overflow-hidden border-t border-zinc-800 ${
          isExpanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0 border-transparent"
        }`}
      >
        <div className="p-5 space-y-4 text-sm">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Host</p>
            <div className="flex items-center gap-2">
              <code className="text-zinc-300">{server.local_url || server.public_url || "—"}</code>
              {(server.local_url || server.public_url) && (
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(server.local_url || server.public_url || "")
                  }
                  className="p-1 rounded hover:bg-zinc-800"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
          </div>
          {server.edge && (
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Edge</p>
              <span className="inline-flex px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                {server.edge}
              </span>
            </div>
          )}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Services</p>
            <div className="flex flex-wrap gap-2">
              {server.services.map((s) => (
                <span key={s} className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Notes</p>
            <textarea
              value={server.notes}
              onChange={(e) => onNotesChangeAction(e.target.value)}
              placeholder="Add notes…"
              className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 resize-none focus:outline-none focus:border-zinc-700"
              rows={2}
            />
          </div>
          <button
            onClick={onMaintenanceToggleAction}
            className={`w-full px-4 py-2 rounded-xl border text-sm ${
              server.maintenance_mode
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {server.maintenance_mode ? "Maintenance ON" : "Maintenance OFF"}
          </button>
          {hasAccess && (
            <button
              onClick={onOpenAccessAction}
              className="w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center gap-2"
            >
              Access options <ExternalLink size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
