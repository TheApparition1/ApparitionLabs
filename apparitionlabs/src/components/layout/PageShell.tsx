import Link from "next/link";
import { Background } from "./Background";

export type NavPage = "monitoring" | "access" | "settings" | "history";

const links: { href: string; label: string; id: NavPage }[] = [
  { href: "/", label: "Monitoring", id: "monitoring" },
  { href: "/access", label: "Access", id: "access" },
  { href: "/history", label: "History", id: "history" },
  { href: "/settings", label: "Settings", id: "settings" },
];

export function NavLinks({ active }: { active: NavPage }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={`text-sm border border-zinc-800 bg-zinc-950 px-4 py-2 rounded-xl hover:bg-zinc-900 transition ${
            active === link.id ? "text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function PageShell({
  active,
  title,
  subtitle,
  children,
  actions,
}: {
  active: NavPage;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <Background />
      <div className="relative z-10 p-8">
        <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <NavLinks active={active} />
            <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-zinc-500 mt-2 text-sm">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}
