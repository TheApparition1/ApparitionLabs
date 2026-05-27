import type {
  AppConfig,
  DashboardStats,
  Incident,
  LatencyPoint,
  ServerStatus,
} from "./types";
import { CONFIG_STORAGE_KEY, defaultConfig } from "./defaults";

export function isTauri() {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

function loadLocalConfig(): AppConfig {
  if (typeof window === "undefined") return defaultConfig();
  const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!raw) {
    const config = defaultConfig();
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return config;
  }
  try {
    return JSON.parse(raw) as AppConfig;
  } catch {
    return defaultConfig();
  }
}

function saveLocalConfig(config: AppConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export async function getConfig(): Promise<AppConfig> {
  if (isTauri()) return invoke<AppConfig>("get_config");
  return loadLocalConfig();
}

export async function saveConfig(config: AppConfig): Promise<void> {
  if (isTauri()) {
    await invoke("save_app_config", { config });
    return;
  }
  saveLocalConfig(config);
}

export async function exportConfigJson(): Promise<string> {
  if (isTauri()) return invoke<string>("export_config");
  return JSON.stringify(await getConfig(), null, 2);
}

export async function importConfigJson(json: string, merge: boolean): Promise<AppConfig> {
  if (isTauri()) return invoke<AppConfig>("import_config", { json, merge });
  const imported = JSON.parse(json) as AppConfig;
  if (merge) {
    const current = await getConfig();
    for (const server of imported.servers) {
      const idx = current.servers.findIndex((s) => s.id === server.id);
      if (idx >= 0) current.servers[idx] = server;
      else current.servers.push(server);
    }
    for (const link of imported.access_links) {
      const idx = current.access_links.findIndex((l) => l.id === link.id);
      if (idx >= 0) current.access_links[idx] = link;
      else current.access_links.push(link);
    }
    await saveConfig(current);
    return current;
  }
  await saveConfig(imported);
  return imported;
}

function mockStatus(config: AppConfig): ServerStatus[] {
  return config.servers
    .filter((s) => s.enabled)
    .map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      layer1: s.public_url ? ("down" as const) : ("skipped" as const),
      layer2: "down" as const,
      layer3: "down" as const,
      latency: 0,
      layer1_label: "Public Reachability",
      failure_reason: "Run in Tauri for live checks",
      edge: s.edge,
      services: s.services,
      public_url: s.public_url,
      local_url: s.local_url,
      ssh_host: s.ssh_host,
      tags: s.tags,
      maintenance_mode: s.maintenance_mode,
      notes: s.notes,
    }));
}

export async function checkServerStatus(): Promise<ServerStatus[]> {
  if (isTauri()) return invoke<ServerStatus[]>("check_server_status");
  return mockStatus(await getConfig());
}

export async function getLatencyHistory(
  serverId: string,
  hours = 1,
): Promise<LatencyPoint[]> {
  if (isTauri()) return invoke<LatencyPoint[]>("get_latency_history", { serverId, hours });
  return [];
}

export async function getIncidents(limit = 50): Promise<Incident[]> {
  if (isTauri()) return invoke<Incident[]>("get_incidents", { limit });
  return [];
}

export async function getServerUptime(serverId: string, hours = 24): Promise<number> {
  if (isTauri()) return invoke<number>("get_server_uptime", { serverId, hours });
  return 100;
}

export async function getDashboardStats(
  statuses: ServerStatus[],
): Promise<DashboardStats> {
  if (isTauri()) return invoke<DashboardStats>("get_dashboard_stats", { statuses });
  const total = statuses.length;
  return {
    total,
    online: 0,
    degraded: 0,
    offline: total,
    maintenance: 0,
    avg_latency_ms: 0,
    incidents_today: 0,
  };
}

export async function openExternalUrl(url: string) {
  if (isTauri()) {
    await invoke("open_url", { url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function updateServerField(
  serverId: string,
  patch: Partial<AppConfig["servers"][0]>,
) {
  const config = await getConfig();
  const idx = config.servers.findIndex((s) => s.id === serverId);
  if (idx < 0) return config;
  config.servers[idx] = { ...config.servers[idx], ...patch };
  await saveConfig(config);
  return config;
}
