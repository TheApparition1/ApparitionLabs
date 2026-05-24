type QuickAccessCardProps = {
    title: string;
    href: string;
};

export default function QuickAccessCard({ title, href }: QuickAccessCardProps) {
    return (
        <a
            href={href}
            className="w-full bg-zinc-900 p-4 rounded-xl text-center hover:bg-zinc-800 hover:scale-[1.02] transition-all duration-300"
        >
            {title}
        </a>
    );
}