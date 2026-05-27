"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig, DashboardStats, ServerStatus } from "@/lib/types";
import { checkServerStatus, getDashboardStats } from "@/lib/api";
import { mergeMonitoringList } from "@/lib/monitoring-display";

export function useMonitoring(config: AppConfig | null) {
  const [statuses, setStatuses] = useState<ServerStatus[]>([]);
  const [lastGood, setLastGood] = useState<ServerStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);
  const inFlightRef = useRef(false);
  const pendingPollRef = useRef(false);
  const lastGoodRef = useRef<ServerStatus[]>([]);
  const pollRef = useRef<() => void>(() => {});

  const refreshInterval = config?.settings.refresh_interval_ms ?? 5000;
  const serverKey = config?.servers.map((s) => `${s.id}:${s.enabled}`).join("|") ?? "";

  const displayStatuses = useMemo(() => {
    if (!config) return [];
    const source = statuses.length > 0 ? statuses : lastGood;
    return mergeMonitoringList(config.servers, source);
  }, [config, statuses, lastGood]);

  useEffect(() => {
    if (!config) return;

    async function runPoll() {
      if (inFlightRef.current) {
        pendingPollRef.current = true;
        return;
      }
      inFlightRef.current = true;
      setPolling(true);

      try {
        const results = await checkServerStatus();
        if (results.length > 0) {
          lastGoodRef.current = results;
          setLastGood(results);
          setStatuses(results);
          const dashboardStats = await getDashboardStats(results);
          setStats(dashboardStats);
          setLastUpdated(Date.now());
        } else if (lastGoodRef.current.length > 0) {
          console.warn("Health check returned no results; keeping last known status");
        }
      } catch (e) {
        console.error("Health check failed:", e);
      } finally {
        inFlightRef.current = false;
        setPolling(false);
        if (pendingPollRef.current) {
          pendingPollRef.current = false;
          void runPoll();
        }
      }
    }

    pollRef.current = () => void runPoll();

    const initial = window.setTimeout(() => void runPoll(), 0);
    const interval = setInterval(() => void runPoll(), refreshInterval);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [serverKey, refreshInterval, config]);

  const poll = () => pollRef.current();

  return {
    displayStatuses,
    stats,
    lastUpdated,
    polling,
    poll,
    hasConfig: !!config,
  };
}
