"use client";

import { X, ExternalLink } from "lucide-react";
import type { ServerStatus } from "@/lib/types";

export function AccessModal({
  server,
  onCloseAction,
  onOpenUrlAction,
  onOpenSSHAction,
}: {
  server: ServerStatus;
  onCloseAction: () => void;
  onOpenUrlAction: (url: string) => void;
  onOpenSSHAction: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCloseAction} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
        <button
          onClick={onCloseAction}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"
        >
          <X size={16} />
        </button>
        <h3 className="text-xl font-semibold mb-2">{server.name}</h3>
        <p className="text-zinc-400 text-sm mb-6">Choose how you want to access this server</p>
        <div className="space-y-3">
          {server.public_url && (
            <AccessButton
              title="Public URL"
              subtitle="Cloudflare tunnel or public domain"
              onClick={() => onOpenUrlAction(server.public_url!)}
            />
          )}
          {server.local_url && (
            <AccessButton
              title="Local URL"
              subtitle={server.local_url}
              onClick={() => onOpenUrlAction(server.local_url!)}
            />
          )}
          {server.ssh_host && (
            <AccessButton
              title="SSH"
              subtitle={server.ssh_host}
              onClick={onOpenSSHAction}
            />
          )}
        </div>
        {(server.local_url || server.ssh_host) && (
          <p className="mt-6 text-zinc-500 text-xs p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            Remote access may require Twingate or Tailscale.
          </p>
        )}
      </div>
    </div>
  );
}

function AccessButton({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-left flex justify-between items-center"
    >
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-zinc-500 text-xs mt-1 truncate max-w-[260px]">{subtitle}</p>
      </div>
      <ExternalLink size={16} className="text-zinc-400 shrink-0" />
    </button>
  );
}
