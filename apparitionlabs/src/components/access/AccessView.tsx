"use client";

import {
  Cloud,
  Shield,
  Network,
  Globe,
  ArrowUpRight,
  Server,
  Link2,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { useAppConfig } from "@/hooks/useAppConfig";
import { openExternalUrl } from "@/lib/api";
import type { AccessLink } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  cloud: Cloud,
  shield: Shield,
  network: Network,
  globe: Globe,
  server: Server,
  link: Link2,
};

export function AccessView() {
  const { config, loading } = useAppConfig();

  const serverLinks =
    config?.servers
      .filter((s) => s.enabled && (s.public_url || s.local_url))
      .map((s) => ({
        id: `server-${s.id}`,
        name: s.name,
        description: s.public_url ? "Public URL" : "Local URL",
        url: s.public_url || s.local_url!,
        icon: "server",
        category: "server" as const,
      })) ?? [];

  const platforms = [...(config?.access_links ?? []), ...serverLinks];

  return (
    <PageShell active="access" title="Apparition Labs" subtitle="Secure Access Console">
      {loading && <p className="text-zinc-500">Loading…</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {platforms.map((platform) => (
          <AccessCard key={platform.id} platform={platform} />
        ))}
      </div>
      {!loading && platforms.length === 0 && (
        <p className="text-zinc-500">
          No access links configured. Add them in{" "}
          <a href="/settings" className="text-white underline">
            Settings
          </a>
          .
        </p>
      )}
    </PageShell>
  );
}

function AccessCard({
  platform,
}: {
  platform: AccessLink | { id: string; name: string; description: string; url: string; icon: string; category: string };
}) {
  const Icon = iconMap[platform.icon] ?? Globe;

  return (
    <button
      type="button"
      onClick={() => void openExternalUrl(platform.url)}
      className="group rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl p-6 hover:border-zinc-700 transition text-left w-full hover:scale-[1.01]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Icon size={22} />
          </div>
          <h2 className="text-xl font-semibold">{platform.name}</h2>
          <p className="text-zinc-500 text-sm mt-2">{platform.description}</p>
          <p className="text-zinc-600 text-xs mt-2 truncate max-w-sm">{platform.url}</p>
        </div>
        <ArrowUpRight size={20} className="text-zinc-600 group-hover:text-white transition shrink-0" />
      </div>
    </button>
  );
}
