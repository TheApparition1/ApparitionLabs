import type { AppConfig } from "./types";

export const CONFIG_STORAGE_KEY = "apparitionlabs_config";

export const defaultConfig = (): AppConfig => ({
  version: 1,
  servers: [
    {
      id: "srv-proxmox-1",
      name: "Proxmox 1",
      host: "192.168.8.154",
      port: 8006,
      type: "proxmox",
      tags: ["homelab", "compute"],
      enabled: true,
      local_url: "https://192.168.8.154:8006",
      ssh_host: "192.168.8.154",
      tunnel_port: 443,
      check_type: "tcp",
      edge: "SYD",
      services: ["API", "SSH"],
      notes: "",
      maintenance_mode: false,
      sort_order: 0,
    },
    {
      id: "srv-proxmox-2",
      name: "Proxmox 2",
      host: "192.168.8.153",
      port: 8006,
      type: "proxmox",
      tags: ["homelab", "compute"],
      enabled: true,
      local_url: "https://192.168.8.153:8006",
      ssh_host: "192.168.8.153",
      tunnel_port: 443,
      check_type: "tcp",
      edge: "SYD",
      services: ["API", "SSH"],
      notes: "",
      maintenance_mode: false,
      sort_order: 1,
    },
    {
      id: "srv-truenas",
      name: "TrueNAS",
      host: "192.168.8.236",
      port: 443,
      type: "nas",
      tags: ["homelab", "storage"],
      enabled: true,
      local_url: "https://192.168.8.236",
      ssh_host: "192.168.8.236",
      tunnel_port: 443,
      check_type: "https",
      edge: "SYD",
      services: ["SMB", "API"],
      notes: "",
      maintenance_mode: false,
      sort_order: 2,
    },
    {
      id: "srv-n8n",
      name: "n8n",
      host: "192.168.8.236",
      port: 30109,
      type: "service",
      tags: ["homelab", "automation"],
      enabled: true,
      local_url: "http://192.168.8.236:30109",
      tunnel_port: 443,
      check_type: "http",
      edge: "SYD",
      services: ["Workflows", "API"],
      notes: "",
      maintenance_mode: false,
      sort_order: 3,
    },
  ],
  access_links: [
    {
      id: "acc-cloudflare",
      name: "Cloudflare Dashboard",
      description: "Global DNS & Edge Management",
      url: "https://dash.cloudflare.com",
      icon: "cloud",
      category: "cloudflare",
    },
    {
      id: "acc-zero-trust",
      name: "Cloudflare Zero Trust",
      description: "Tunnel & Access Control",
      url: "https://one.dash.cloudflare.com",
      icon: "shield",
      category: "cloudflare",
    },
    {
      id: "acc-twingate",
      name: "Twingate",
      description: "Remote Infrastructure Access",
      url: "https://apparitioncreatives.twingate.com",
      icon: "network",
      category: "vpn",
    },
    {
      id: "acc-tailscale",
      name: "Tailscale",
      description: "Mesh Network Management",
      url: "https://login.tailscale.com/admin/machines",
      icon: "globe",
      category: "vpn",
    },
  ],
  settings: {
    refresh_interval_ms: 5000,
    tcp_timeout_secs: 2,
    latency_warning_ms: 100,
    notifications_enabled: true,
    notify_on_recovery: true,
    notify_cooldown_secs: 300,
    history_retention_days: 30,
    theme: "dark",
  },
});

export function newServerId() {
  return `srv-${crypto.randomUUID()}`;
}

export function newAccessLinkId() {
  return `acc-${crypto.randomUUID()}`;
}

export function typeDefaults(type: string) {
  switch (type) {
    case "proxmox":
      return { port: 8006, check_type: "tcp" as const, services: ["API", "SSH"] };
    case "nas":
      return { port: 443, check_type: "https" as const, services: ["SMB", "API"] };
    case "service":
      return { port: 8080, check_type: "http" as const, services: ["API"] };
    default:
      return { port: 443, check_type: "tcp" as const, services: ["API"] };
  }
}
