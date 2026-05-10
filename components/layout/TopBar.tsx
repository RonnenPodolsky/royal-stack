import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatChips } from "@/lib/format";

type Props = {
  bankroll?: number;
  username?: string;
  active?: "lobby" | "tables" | "tournaments" | "leaderboard" | "profile" | "cashier" | "stats";
  balanceTone?: "primary" | "secondary";
};

export function TopBar({ bankroll, username, active = "lobby", balanceTone = "primary" }: Props) {
  const linkClass = (key: string) =>
    active === key
      ? "text-primary font-bold"
      : "text-on-surface-variant font-medium hover:text-primary transition-colors duration-200";

  const balanceColor = balanceTone === "secondary" ? "text-secondary" : "text-primary";
  const balanceIcon = balanceTone === "secondary" ? "text-secondary" : "text-primary";

  return (
    <header className="fixed top-0 w-full z-50 bg-surface border-b border-white/5 shadow-sm">
      <div className="flex justify-between items-center h-16 px-margin-mobile md:px-margin-desktop w-full mx-auto">
        <div className="flex items-center gap-8">
          <Link
            href="/lobby"
            className="text-headline-sm font-display font-black text-primary tracking-tighter"
          >
            Royal Stack
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/lobby" className={linkClass("lobby")}>Lobby</Link>
            <Link href="/lobby" className={linkClass("tables")}>Tables</Link>
            <Link href="/profile" className={linkClass("profile") + " " + linkClass("stats")}>Profile</Link>
            <Link href="/cashier" className={linkClass("cashier")}>Cashier</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {bankroll !== undefined && (
            <Link
              href="/cashier"
              className="hidden sm:flex items-center bg-surface-container rounded-full px-3 py-1.5 border border-white/5 hover:border-primary/40 transition-colors gap-2"
            >
              <Icon name="account_balance_wallet" filled className={`${balanceIcon} text-[20px]`} />
              <span className={`font-stat text-stat-lg ${balanceColor}`}>{formatChips(bankroll)}</span>
            </Link>
          )}
          <button
            type="button"
            aria-label="Settings"
            className="cursor-pointer active:scale-95 text-on-surface-variant hover:text-primary"
          >
            <Icon name="settings" />
          </button>
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full border-2 border-primary bg-primary-container/20 flex items-center justify-center font-bold text-primary"
            aria-label="Profile"
          >
            {(username ?? "?").slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
