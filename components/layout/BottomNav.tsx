import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type Props = {
  active?: "lobby" | "tables" | "stats" | "shop" | "profile";
};

const items = [
  { key: "lobby" as const, href: "/lobby", icon: "casino", label: "Lobby" },
  { key: "tables" as const, href: "/lobby", icon: "style", label: "Tables" },
  { key: "stats" as const, href: "/profile", icon: "analytics", label: "Stats" },
  { key: "shop" as const, href: "/cashier", icon: "shopping_bag", label: "Shop" },
];

export function BottomNav({ active = "lobby" }: Props) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-safe bg-surface-container-highest/90 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-50 rounded-t-full h-16">
      {items.map((it) => {
        const isActive = active === it.key;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-transform ${
              isActive ? "text-primary scale-110" : "text-on-surface-variant opacity-60"
            }`}
          >
            <Icon name={it.icon} filled={isActive} />
            <span className="font-label text-label-caps mt-1">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
