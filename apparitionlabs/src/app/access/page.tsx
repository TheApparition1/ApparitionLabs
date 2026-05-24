import Link from "next/link";
import {
    Cloud,
    Shield,
    Network,
    Globe,
    ArrowUpRight,
} from "lucide-react";

const platforms = [
    {
        name: "Cloudflare Dashboard",
        description: "Global DNS & Edge Management",
        url: "https://dash.cloudflare.com",
        icon: Cloud,
    },
    {
        name: "Cloudflare Zero Trust",
        description: "Tunnel & Access Control",
        url: "https://one.dash.cloudflare.com",
        icon: Shield,
    },
    {
        name: "Twingate",
        description: "Remote Infrastructure Access",
        url: "https://apparitioncreatives.twingate.com",
        icon: Network,
    },
    {
        name: "Tailscale",
        description: "Mesh Network Management",
        url: "https://login.tailscale.com/admin/machines",
        icon: Globe,
    },
];

export default function AccessPage() {
    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* GRID BACKGROUND */}
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* TOP GLOW */}
            <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-white/5 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 p-8">
                {/* HEADER */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <Link
                            href="/"
                            className="text-sm text-zinc-400 border border-zinc-800 bg-zinc-950 px-4 py-2 rounded-xl hover:bg-zinc-900 hover:text-white transition"
                        >
                            Monitoring
                        </Link>

                        <Link
                            href="/access"
                            className="text-sm text-white border border-zinc-800 bg-zinc-950 px-4 py-2 rounded-xl hover:bg-zinc-900 transition"
                        >
                            Access
                        </Link>
                    </div>

                    <h1 className="text-4xl font-bold tracking-tight">
                        Apparition Labs
                    </h1>

                    <p className="text-zinc-500 mt-2 text-sm">
                        Secure Access Console
                    </p>
                </div>

                {/* ACCESS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {platforms.map((platform) => {
                        const Icon = platform.icon;

                        return (
                            <a
                                key={platform.name}
                                href={platform.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="
                                    group
                                    rounded-2xl
                                    border
                                    border-zinc-800
                                    bg-zinc-950/90
                                    backdrop-blur-xl
                                    p-6
                                    hover:border-zinc-700
                                    transition-all
                                    duration-300
                                    hover:scale-[1.01]
                                "
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                                            <Icon size={22} />
                                        </div>

                                        <h2 className="text-xl font-semibold">
                                            {platform.name}
                                        </h2>

                                        <p className="text-zinc-500 text-sm mt-2">
                                            {platform.description}
                                        </p>
                                    </div>

                                    <ArrowUpRight
                                        size={20}
                                        className="
                                            text-zinc-600
                                            group-hover:text-white
                                            transition
                                        "
                                    />
                                </div>
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}