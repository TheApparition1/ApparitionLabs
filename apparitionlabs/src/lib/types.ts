export type ServerType = "proxmox" | "nas" | "service" | "custom";
export type CheckType = "tcp" | "http" | "https";
export type LayerStatus = "ok" | "down" | "degraded" | "skipped";

export type MonitorTarget = {
  id: string;
  name: string;
  host: string;
  port: number;
  type: ServerType;
  tags: string[];
  enabled: boolean;
  public_url?: string;
  local_url?: string;
  ssh_host?: string;
  tunnel_port?: number;
  latency_warning_ms?: number;
  check_type: CheckType;
  edge?: string;
  services: string[];
  notes: string;
  maintenance_mode: boolean;
  sort_order: number;
};

export type AccessLink = {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: "cloudflare" | "vpn" | "server" | "custom";
};

export type AppSettings = {
  refresh_interval_ms: number;
  tcp_timeout_secs: number;
  latency_warning_ms: number;
  notifications_enabled: boolean;
  notify_on_recovery: boolean;
  notify_cooldown_secs: number;
  webhook_url?: string;
  history_retention_days: number;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  theme: "light" | "dark";
};

export type AppConfig = {
  version: number;
  servers: MonitorTarget[];
  access_links: AccessLink[];
  settings: AppSettings;
};

export type ServerStatus = {
  id: string;
  name: string;
  type: string;
  layer1: LayerStatus;
  layer2: LayerStatus;
  layer3: LayerStatus;
  latency: number;
  layer1_label: string;
  failure_reason?: string;
  edge?: string;
  services: string[];
  public_url?: string;
  local_url?: string;
  ssh_host?: string;
  tags: string[];
  maintenance_mode: boolean;
  notes: string;
};

export type LatencyPoint = {
  timestamp: number;
  latency_ms: number;
};

export type Incident = {
  id: number;
  server_id: string;
  server_name: string;
  started_at: number;
  ended_at?: number;
  cause: string;
};

export type DashboardStats = {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  maintenance: number;
  avg_latency_ms: number;
  incidents_today: number;
};

export type OverallStatus = "online" | "offline" | "degraded" | "maintenance";

export function overallStatus(s: ServerStatus): OverallStatus {
  if (s.maintenance_mode) return "maintenance";
  // Service health is primary; public URL and tunnel are optional layers.
  if (s.layer3 === "down") return "offline";
  if (s.layer1 === "down") return "offline";
  if (s.layer2 === "down") return "offline";
  if (s.layer1 === "degraded" || s.layer2 === "degraded" || s.layer3 === "degraded") {
    return "degraded";
  }
  return "online";
}

export function statusStyle(status: OverallStatus) {
  switch (status) {
    case "offline":
      return { color: "text-red-400", glow: "0 0 30px rgba(239,68,68,0.25)", label: "OFFLINE" };
    case "degraded":
      return { color: "text-yellow-400", glow: "0 0 30px rgba(234,179,8,0.25)", label: "DEGRADED" };
    case "maintenance":
      return { color: "text-yellow-400", glow: "0 0 30px rgba(234,179,8,0.15)", label: "MAINTENANCE" };
    default:
      return { color: "text-green-400", glow: "0 0 30px rgba(34,197,94,0.25)", label: "ONLINE" };
  }
}

export function layerLabel(status: LayerStatus, okText: string) {
  if (status === "ok") return okText;
  if (status === "skipped") return "N/A";
  return status;
}

export function layerOk(status: LayerStatus) {
  return status === "ok" || status === "skipped";
}
