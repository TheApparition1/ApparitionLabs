"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { useAppConfig } from "@/hooks/useAppConfig";
import type { AccessLink, AppConfig, MonitorTarget, ServerType } from "@/lib/types";
import { exportConfigJson, importConfigJson } from "@/lib/api";
import { newAccessLinkId, newServerId, typeDefaults } from "@/lib/defaults";

function SettingsContent() {
  const { config, loading, persist, reload } = useAppConfig();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [tab, setTab] = useState<"servers" | "access" | "app">("servers");
  const [editing, setEditing] = useState<MonitorTarget | null>(null);
  const [editingLink, setEditingLink] = useState<AccessLink | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!config || !editId) return;
    const t = setTimeout(() => {
      const server = config.servers.find((s) => s.id === editId);
      if (server) {
        setEditing(server);
        setTab("servers");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [config, editId]);

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  const saveServer = async (server: MonitorTarget) => {
    if (!config) return;
    const exists = config.servers.some((s) => s.id === server.id);
    const servers = exists
      ? config.servers.map((s) => (s.id === server.id ? server : s))
      : [...config.servers, server];
    await persist({ ...config, servers });
    setEditing(null);
    showMsg("Server saved");
  };

  const deleteServer = async (id: string) => {
    if (!config || !confirm("Delete this server?")) return;
    await persist({
      ...config,
      servers: config.servers.filter((s) => s.id !== id),
    });
    showMsg("Server deleted");
  };

  const duplicateServer = async (server: MonitorTarget) => {
    const copy: MonitorTarget = {
      ...server,
      id: newServerId(),
      name: `${server.name} (copy)`,
      sort_order: config?.servers.length ?? 0,
    };
    await saveServer(copy);
  };

  const saveLink = async (link: AccessLink) => {
    if (!config) return;
    const exists = config.access_links.some((l) => l.id === link.id);
    const access_links = exists
      ? config.access_links.map((l) => (l.id === link.id ? link : l))
      : [...config.access_links, link];
    await persist({ ...config, access_links });
    setEditingLink(null);
    showMsg("Link saved");
  };

  const saveSettings = async (settings: AppConfig["settings"]) => {
    if (!config) return;
    await persist({ ...config, settings });
    showMsg("Settings saved");
  };

  const handleExport = async () => {
    const json = await exportConfigJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apparitionlabs-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (merge: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      await importConfigJson(text, merge);
      await reload();
      showMsg(merge ? "Config merged" : "Config imported");
    };
    input.click();
  };

  const newServer = () => {
    const defaults = typeDefaults("custom");
    setEditing({
      id: newServerId(),
      name: "",
      host: "",
      port: defaults.port,
      type: "custom",
      tags: [],
      enabled: true,
      tunnel_port: 443,
      check_type: defaults.check_type,
      services: defaults.services,
      notes: "",
      maintenance_mode: false,
      sort_order: config?.servers.length ?? 0,
    });
  };

  if (loading || !config) {
    return (
      <PageShell active="settings" title="Settings" subtitle="Loading…">
        <p className="text-zinc-500">Loading configuration…</p>
      </PageShell>
    );
  }

  return (
    <PageShell active="settings" title="Settings" subtitle="Manage servers, access links, and app preferences">
      {message && (
        <p className="mb-4 text-sm text-green-400 border border-green-500/30 bg-green-500/10 px-4 py-2 rounded-xl">
          {message}
        </p>
      )}

      <div className="flex gap-2 mb-8 flex-wrap">
        {(["servers", "access", "app"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border text-sm capitalize ${
              tab === t
                ? "border-white/30 bg-zinc-900 text-white"
                : "border-zinc-800 text-zinc-500 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => void handleExport()} className="px-4 py-2 rounded-xl border border-zinc-800 text-sm hover:bg-zinc-900">
            Export
          </button>
          <button onClick={() => void handleImport(true)} className="px-4 py-2 rounded-xl border border-zinc-800 text-sm hover:bg-zinc-900">
            Import (merge)
          </button>
          <button onClick={() => void handleImport(false)} className="px-4 py-2 rounded-xl border border-zinc-800 text-sm hover:bg-zinc-900">
            Import (replace)
          </button>
        </div>
      </div>

      {tab === "servers" && (
        <ServersTab
          config={config}
          editing={editing}
          onEdit={setEditing}
          onNew={newServer}
          onSave={saveServer}
          onDelete={deleteServer}
          onDuplicate={duplicateServer}
          onCancel={() => setEditing(null)}
        />
      )}

      {tab === "access" && (
        <AccessLinksTab
          config={config}
          editing={editingLink}
          onEdit={setEditingLink}
          onNew={() =>
            setEditingLink({
              id: newAccessLinkId(),
              name: "",
              description: "",
              url: "",
              icon: "globe",
              category: "custom",
            })
          }
          onSave={saveLink}
          onDelete={async (id) => {
            if (!confirm("Delete link?")) return;
            await persist({
              ...config,
              access_links: config.access_links.filter((l) => l.id !== id),
            });
          }}
          onCancel={() => setEditingLink(null)}
        />
      )}

      {tab === "app" && <AppSettingsTab settings={config.settings} onSave={saveSettings} />}
    </PageShell>
  );
}

export function SettingsView() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function ServersTab({
  config,
  editing,
  onEdit,
  onNew,
  onSave,
  onDelete,
  onDuplicate,
  onCancel,
}: {
  config: AppConfig;
  editing: MonitorTarget | null;
  onEdit: (s: MonitorTarget) => void;
  onNew: () => void;
  onSave: (s: MonitorTarget) => void;
  onDelete: (id: string) => void;
  onDuplicate: (s: MonitorTarget) => void;
  onCancel: () => void;
}) {
  const sorted = [...config.servers].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Servers ({sorted.length})</h2>
          <button onClick={onNew} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium">
            Add server
          </button>
        </div>
        {sorted.map((s) => (
          <div
            key={s.id}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex justify-between items-start gap-4"
          >
            <div>
              <p className="font-medium">{s.name || "Unnamed"}</p>
              <p className="text-zinc-500 text-sm">
                {s.host}:{s.port} · {s.type} · {s.enabled ? "enabled" : "disabled"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => onEdit(s)} className="text-xs px-3 py-1 rounded-lg border border-zinc-700">
                Edit
              </button>
              <button onClick={() => void onDuplicate(s)} className="text-xs px-3 py-1 rounded-lg border border-zinc-700">
                Duplicate
              </button>
              <button onClick={() => void onDelete(s.id)} className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ServerForm server={editing} onSave={onSave} onCancel={onCancel} />
      )}
    </div>
  );
}

function ServerForm({
  server,
  onSave,
  onCancel,
}: {
  server: MonitorTarget;
  onSave: (s: MonitorTarget) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(server);

  const set = <K extends keyof MonitorTarget>(key: K, value: MonitorTarget[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onTypeChange = (type: ServerType) => {
    const d = typeDefaults(type);
    setForm((f) => ({
      ...f,
      type,
      port: d.port,
      check_type: d.check_type,
      services: d.services,
    }));
  };

  return (
    <form
      className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-4 sticky top-8 max-h-[85vh] overflow-y-auto"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(form);
      }}
    >
      <h3 className="font-semibold text-lg">{form.id === server.id && server.name ? "Edit server" : "New server"}</h3>
      <Field label="Name" value={form.name} onChange={(v) => set("name", v)} required />
      <Field label="Host" value={form.host} onChange={(v) => set("host", v)} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Port" value={String(form.port)} onChange={(v) => set("port", Number(v))} type="number" />
        <label className="block text-sm">
          <span className="text-zinc-500 text-xs">Type</span>
          <select
            value={form.type}
            onChange={(e) => onTypeChange(e.target.value as ServerType)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900"
          >
            <option value="proxmox">Proxmox</option>
            <option value="nas">NAS</option>
            <option value="service">Service</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-zinc-500 text-xs">Check type</span>
        <select
          value={form.check_type}
          onChange={(e) => set("check_type", e.target.value as MonitorTarget["check_type"])}
          className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900"
        >
          <option value="tcp">TCP</option>
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
        </select>
      </label>
      <Field label="Tags (comma-separated)" value={form.tags.join(", ")} onChange={(v) => set("tags", v.split(",").map((t) => t.trim()).filter(Boolean))} />
      <Field label="Public URL" value={form.public_url ?? ""} onChange={(v) => set("public_url", v || undefined)} />
      <Field label="Local URL" value={form.local_url ?? ""} onChange={(v) => set("local_url", v || undefined)} />
      <Field label="SSH host" value={form.ssh_host ?? ""} onChange={(v) => set("ssh_host", v || undefined)} />
      <Field label="Tunnel port" value={String(form.tunnel_port ?? 443)} onChange={(v) => set("tunnel_port", Number(v))} type="number" />
      <Field label="Edge region" value={form.edge ?? ""} onChange={(v) => set("edge", v || undefined)} />
      <Field label="Services (comma-separated)" value={form.services.join(", ")} onChange={(v) => set("services", v.split(",").map((t) => t.trim()).filter(Boolean))} />
      <Field label="Latency warning (ms)" value={String(form.latency_warning_ms ?? "")} onChange={(v) => set("latency_warning_ms", v ? Number(v) : undefined)} type="number" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
        Enabled
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.maintenance_mode} onChange={(e) => set("maintenance_mode", e.target.checked)} />
        Maintenance mode
      </label>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 py-2 rounded-xl bg-white text-black font-medium">
          Save
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-zinc-700">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AccessLinksTab({
  config,
  editing,
  onEdit,
  onNew,
  onSave,
  onDelete,
  onCancel,
}: {
  config: AppConfig;
  editing: AccessLink | null;
  onEdit: (l: AccessLink) => void;
  onNew: () => void;
  onSave: (l: AccessLink) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-3">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">Access links</h2>
          <button onClick={onNew} className="px-4 py-2 rounded-xl bg-white text-black text-sm">
            Add link
          </button>
        </div>
        {config.access_links.map((l) => (
          <div key={l.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex justify-between">
            <div>
              <p className="font-medium">{l.name}</p>
              <p className="text-zinc-500 text-sm truncate max-w-md">{l.url}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(l)} className="text-xs px-3 py-1 rounded-lg border border-zinc-700">
                Edit
              </button>
              <button onClick={() => void onDelete(l.id)} className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <AccessLinkForm key={editing.id} link={editing} onSave={onSave} onCancel={onCancel} />
      )}
    </div>
  );
}

function AccessLinkForm({
  link,
  onSave,
  onCancel,
}: {
  link: AccessLink;
  onSave: (l: AccessLink) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(link);

  return (
    <form
      className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(form);
      }}
    >
      <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      <Field label="URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
      <Field label="Icon" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
      <div className="flex gap-3">
        <button type="submit" className="flex-1 py-2 rounded-xl bg-white text-black">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-zinc-700">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AppSettingsTab({
  settings,
  onSave,
}: {
  settings: AppConfig["settings"];
  onSave: (s: AppConfig["settings"]) => void;
}) {
  const [form, setForm] = useState(settings);

  return (
    <form
      className="max-w-lg space-y-4 p-6 rounded-2xl border border-zinc-800 bg-zinc-950"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(form);
      }}
    >
      <h2 className="text-lg font-semibold mb-4">App settings</h2>
      <Field label="Refresh interval (ms)" value={String(form.refresh_interval_ms)} onChange={(v) => setForm({ ...form, refresh_interval_ms: Number(v) })} type="number" />
      <Field label="TCP timeout (seconds)" value={String(form.tcp_timeout_secs)} onChange={(v) => setForm({ ...form, tcp_timeout_secs: Number(v) })} type="number" />
      <Field label="Latency warning (ms)" value={String(form.latency_warning_ms)} onChange={(v) => setForm({ ...form, latency_warning_ms: Number(v) })} type="number" />
      <Field label="Notification cooldown (seconds)" value={String(form.notify_cooldown_secs)} onChange={(v) => setForm({ ...form, notify_cooldown_secs: Number(v) })} type="number" />
      <Field label="History retention (days)" value={String(form.history_retention_days)} onChange={(v) => setForm({ ...form, history_retention_days: Number(v) })} type="number" />
      <Field label="Webhook URL (optional)" value={form.webhook_url ?? ""} onChange={(v) => setForm({ ...form, webhook_url: v || undefined })} />
      <Field label="Quiet hours start (0-23)" value={form.quiet_hours_start != null ? String(form.quiet_hours_start) : ""} onChange={(v) => setForm({ ...form, quiet_hours_start: v ? Number(v) : undefined })} type="number" />
      <Field label="Quiet hours end (0-23)" value={form.quiet_hours_end != null ? String(form.quiet_hours_end) : ""} onChange={(v) => setForm({ ...form, quiet_hours_end: v ? Number(v) : undefined })} type="number" />
      <div className="space-y-2">
        <label className="text-sm text-zinc-400">Theme</label>
        <select
          value={form.theme}
          onChange={(e) => {
            const newTheme = e.target.value as "light" | "dark";
            setForm({ ...form, theme: newTheme });
            localStorage.setItem("theme", newTheme);
          }}
          className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm focus:outline-none focus:border-zinc-700"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.notifications_enabled} onChange={(e) => setForm({ ...form, notifications_enabled: e.target.checked })} />
        Desktop notifications
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.notify_on_recovery} onChange={(e) => setForm({ ...form, notify_on_recovery: e.target.checked })} />
        Notify on recovery
      </label>
      <button type="submit" className="w-full py-2 rounded-xl bg-white text-black font-medium">
        Save settings
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-500 text-xs">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 focus:outline-none focus:border-zinc-600"
      />
    </label>
  );
}
