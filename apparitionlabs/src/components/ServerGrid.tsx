"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Expand,
    Shrink,
    X,
} from "lucide-react";

type Server = {
    name: string;
    type: string;
    layer1: "ok" | "down";
    layer2: "ok" | "down" | "degraded";
    layer3: "ok" | "down";

    latency?: number;
    edge?: string;
    services?: string[];
    url?: string;
    localUrl?: string;
};

function Background() {
    return (
        <>
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-white/5 blur-3xl rounded-full pointer-events-none" />
        </>
    );
}

export function NavLinks({ active }: { active: "monitoring" | "access" }) {
    return (
        <div className="flex items-center gap-3 mb-3">
            <Link
                href="/"
                className={`text-sm border border-zinc-800 bg-zinc-950 px-4 py-2 rounded-xl hover:bg-zinc-900 transition ${
                    active === "monitoring" ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
            >
                Monitoring
            </Link>
            <Link
                href="/access"
                className={`text-sm border border-zinc-800 bg-zinc-950 px-4 py-2 rounded-xl hover:bg-zinc-900 transition ${
                    active === "access" ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
            >
                Access
            </Link>
        </div>
    );
}

function Header({ lastUpdated, expandAll, onToggleExpandAll }: {
    lastUpdated: number | null;
    expandAll: boolean;
    onToggleExpandAll: () => void;
}) {
    return (
        <div className="mb-10 flex items-start justify-between gap-4">
            <div>
                <NavLinks active="monitoring" />
                <h1 className="text-4xl font-bold tracking-tight">
                    Apparition Labs
                </h1>
                <p className="text-zinc-500 mt-2 text-sm">
                    Server Monitoring Software - Built by Samuel Dingle
                </p>
                {lastUpdated && (
                    <p className="text-zinc-700 text-xs mt-3">
                        Last update • {new Date(lastUpdated).toLocaleTimeString()} • Next.js 15.5.18
                    </p>
                )}
            </div>
            <button
                onClick={onToggleExpandAll}
                className="h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center gap-2 text-sm hover:bg-zinc-900 transition"
            >
                {expandAll ? <Shrink size={16} /> : <Expand size={16} />}
                {expandAll ? "Collapse All" : "Expand All"}
            </button>
        </div>
    );
}

export function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-zinc-400">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
                <span className={ok ? "text-green-400" : "text-red-400"}>{value}</span>
            </div>
        </div>
    );
}

export function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{label}</p>
            {children}
        </div>
    );
}

function ExpandedSection({ server, onOpenAccessModal }: { server: Server; onOpenAccessModal: () => void }) {
    return (
        <div className="space-y-5">
            <DetailItem label="Response Latency">
                <p className="text-2xl font-semibold">{server.latency ?? 24}ms</p>
            </DetailItem>
            <DetailItem label="Cloudflare Edge">
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-sm">
                    {server.edge ?? "SYD"}
                </div>
            </DetailItem>
            <DetailItem label="Services">
                <div className="flex flex-wrap gap-2">
                    {(server.services ?? ["Tunnel", "API", "SSH"]).map((service) => (
                        <div key={service} className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-sm">
                            {service}
                        </div>
                    ))}
                </div>
            </DetailItem>
            {server.url && (
                <div className="mt-6 pt-5 border-t border-zinc-800">
                    <button
                        onClick={onOpenAccessModal}
                        className="
                            w-full
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-zinc-800
                            bg-zinc-900
                            px-4
                            py-3
                            text-sm
                            hover:bg-zinc-800
                            hover:border-zinc-700
                            transition-all
                            duration-200
                        "
                    >
                        Access Management Interface
                        <ExternalLink size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

export function AccessModal({ server, onClose, onOpenUrl }: {
    server: Server;
    onClose: () => void;
    onOpenUrl: (url: string) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition"
                >
                    <X size={16} />
                </button>

                <h3 className="text-xl font-semibold mb-2">{server.name}</h3>
                <p className="text-zinc-400 text-sm mb-6">Choose how you want to access this server</p>

                <div className="space-y-3">
                    <button
                        onClick={() => onOpenUrl(server.url!)}
                        className="w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 transition text-left"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Cloudflare Tunnel</p>
                                <p className="text-zinc-500 text-xs mt-1">Access via public domain</p>
                            </div>
                            <ExternalLink size={16} className="text-zinc-400" />
                        </div>
                    </button>

                    {server.localUrl && (
                        <button
                            onClick={() => onOpenUrl(server.localUrl!)}
                            className="w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 transition text-left"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Local IP</p>
                                    <p className="text-zinc-500 text-xs mt-1">{server.localUrl}</p>
                                </div>
                                <ExternalLink size={16} className="text-zinc-400" />
                            </div>
                        </button>
                    )}
                </div>

                {server.localUrl && (
                    <div className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <p className="text-zinc-400 text-xs">
                            <span className="text-yellow-400 font-medium">Note:</span> To access via Local IP remotely, you must be connected to{" "}
                            <span className="text-white">Twingate</span> or <span className="text-white">Tailscale</span>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ServerCard({ server, isExpanded, onToggle, status, onOpenAccessModal }: {
    server: Server;
    isExpanded: boolean;
    onToggle: () => void;
    status: { color: string; glow: string; label: string };
    onOpenAccessModal: () => void;
}) {
    return (
        <div
            className="rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-zinc-700"
            style={{ boxShadow: status.glow }}
        >
            <div className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">{server.name}</h2>
                        <div className={`mt-2 text-xs font-medium tracking-widest ${status.color}`}>
                            {status.label}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {server.url && (
                            <button
                                onClick={onOpenAccessModal}
                                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:border-zinc-700 transition"
                                title="Open Server"
                            >
                                <ExternalLink size={16} />
                            </button>
                        )}

                        <button
                            onClick={onToggle}
                            className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition"
                        >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                    </div>
                </div>
                <div className="mt-6 space-y-3 text-sm">
                    <StatusRow
                        label="Cloudflare Edge"
                        value={server.layer1 === "ok" ? "Online" : "Offline"}
                        ok={server.layer1 === "ok"}
                    />
                    <StatusRow
                        label="Tunnel / Access"
                        value={server.layer2 === "ok" ? "Healthy" : server.layer2}
                        ok={server.layer2 === "ok"}
                    />
                    <StatusRow
                        label="Server Health"
                        value={server.layer3 === "ok" ? "Healthy" : "Offline"}
                        ok={server.layer3 === "ok"}
                    />
                </div>
            </div>
            <div
                className={`transition-all duration-300 overflow-hidden border-t border-zinc-800 ${
                    isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 border-transparent"
                }`}
            >
                <div className="p-5">
                    <ExpandedSection server={server} onOpenAccessModal={onOpenAccessModal} />
                </div>
            </div>
        </div>
    );
}

export default function ServerGrid() {
    const [data, setData] = useState<Server[]>([]);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [expandAll, setExpandAll] = useState(false);
    const [accessModalServer, setAccessModalServer] = useState<Server | null>(null);

    const fetchStatus = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(`/api/status?t=${Date.now()}&r=${Math.random()}`, {
                cache: "no-store",
                signal: controller.signal,
            });

            clearTimeout(timeout);
            if (!res.ok) return;

            const json = await res.json();
            setData(json.servers);
            setLastUpdated(json.updated);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const getOverallStatus = (s: Server) => {
        if (s.layer1 === "down" || s.layer3 === "down") {
            return { color: "text-red-400", glow: "0 0 30px rgba(239,68,68,0.25)", label: "OFFLINE" };
        }
        if (s.layer2 === "degraded") {
            return { color: "text-yellow-400", glow: "0 0 30px rgba(234,179,8,0.25)", label: "DEGRADED" };
        }
        return { color: "text-green-400", glow: "0 0 30px rgba(34,197,94,0.25)", label: "ONLINE" };
    };

    const handleToggleExpandAll = () => {
        const next = !expandAll;
        setExpandAll(next);
        setExpanded(next ? Object.fromEntries(data.map(s => [s.name, true])) : {});
    };

    const handleOpenAccessModal = (server: Server) => {
        setAccessModalServer(server);
    };

    const handleCloseAccessModal = () => {
        setAccessModalServer(null);
    };

    const handleOpenUrl = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        setAccessModalServer(null);
    };

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            <Background />
            <div className="relative z-10 p-8">
                <Header
                    lastUpdated={lastUpdated}
                    expandAll={expandAll}
                    onToggleExpandAll={handleToggleExpandAll}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {data.map((s) => (
                        <ServerCard
                            key={s.name}
                            server={s}
                            isExpanded={expanded[s.name]}
                            onToggle={() => {
                                setExpanded(prev => ({ ...prev, [s.name]: !prev[s.name] }));
                                setExpandAll(false);
                            }}
                            status={getOverallStatus(s)}
                            onOpenAccessModal={() => handleOpenAccessModal(s)}
                        />
                    ))}
                </div>
            </div>

            {accessModalServer && (
                <AccessModal
                    server={accessModalServer}
                    onClose={handleCloseAccessModal}
                    onOpenUrl={handleOpenUrl}
                />
            )}
        </div>
    );
}