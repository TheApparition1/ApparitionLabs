import type { MonitorTarget, ServerStatus } from "./types";

/** Placeholder shown until the first successful health check for a server. */
export function targetToPlaceholder(target: MonitorTarget): ServerStatus {
  return {
    id: target.id,
    name: target.name,
    type: target.type,
    layer1: "skipped",
    layer2: "skipped",
    layer3: "skipped",
    latency: 0,
    layer1_label: "Public Reachability",
    edge: target.edge,
    services: target.services ?? [],
    public_url: target.public_url,
    local_url: target.local_url,
    ssh_host: target.ssh_host,
    tags: target.tags ?? [],
    maintenance_mode: target.maintenance_mode,
    notes: target.notes,
  };
}

/**
 * Always derive the monitoring grid from config (source of truth), merged with latest poll results.
 */
export function mergeMonitoringList(
  servers: MonitorTarget[],
  statuses: ServerStatus[],
): ServerStatus[] {
  const byId = new Map(statuses.map((s) => [s.id, s]));

  return servers
    .filter((s) => s.enabled)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((target) => byId.get(target.id) ?? targetToPlaceholder(target));
}

export function enabledServerCount(servers: MonitorTarget[]) {
  return servers.filter((s) => s.enabled).length;
}
