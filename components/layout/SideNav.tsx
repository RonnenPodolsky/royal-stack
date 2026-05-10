import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type Props = {
  active?: "lobby" | "tables" | "profile" | "cashier";
};

const items = [
  { key: "lobby" as const, href: "/lobby", icon: "grid_view", label: "Lobby" },
  { key: "tables" as const, href: "/lobby", icon: "playing_cards", label: "Tables" },
  { key: "profile" as const, href: "/profile", icon: "person", label: "Profile" },
  { key: "cashier" as const, href: "/cashier", icon: "payments", label: "Cashier" },
];

export function SideNav({ active = "lobby" }: Props) {
  return (
    <aside className="h-full w-64 fixed left-0 top-0 bg-surface-container-high border-r border-white/5 shadow-xl hidden lg:flex flex-col py-8 pt-24 z-40">
      <div className="px-6 mb-8">
        <h2 className="text-headline-md font-display text-primary tracking-tighter">VIP Lounge</h2>
        <p className="text-on-surface-variant font-label text-label-caps opacity-70">Elite Tier</p>
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <Link
              key={it.key}
              href={it.href}
              className={`flex items-center gap-4 py-3 px-4 transition-all duration-300 ${
                isActive
                  ? "text-primary bg-primary-container/10 border-r-2 border-primary"
                  : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
              }`}
            >
              <Icon name={it.icon} filled={isActive} />
              <span className="font-label text-label-caps">{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-6 my-4">
        <Link
          href="/lobby"
          className="block text-center w-full bg-primary text-on-primary font-bold text-label-caps tracking-widest py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
        >
          QUICK SIT
        </Link>
      </div>
      <div className="mt-auto flex flex-col gap-1 px-3 border-t border-white/5 pt-4">
        <button
          type="button"
          className="text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary flex items-center gap-4 py-3 px-4 transition-all w-full text-left"
        >
          <Icon name="help" />
          <span className="font-label text-label-caps">Support</span>
        </button>
        <Link
          href="/api/auth/signout"
          className="text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary flex items-center gap-4 py-3 px-4 transition-all"
        >
          <Icon name="logout" />
          <span className="font-label text-label-caps">Logout</span>
        </Link>
      </div>
    </aside>
  );
}
