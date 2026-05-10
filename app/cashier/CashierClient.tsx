"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatChips } from "@/lib/format";

type Props = {
  initialBankroll: number;
  initialLastClaimAt: number | null;
};

const COOLDOWN_MS = 1000 * 60 * 60 * 24;
const DAILY_AMOUNT = 5000;

const BUNDLES = [
  { id: "starter", label: "Starter Stack", chips: 50_000, price: "$4.99", featured: false, hue: "neutral" as const },
  { id: "pro", label: "Professional Bundle", chips: 250_000, price: "$19.99", featured: false, hue: "blue" as const },
  { id: "high-roller", label: "High Roller Vault", chips: 1_500_000, price: "$99.99", featured: true, hue: "primary" as const },
  { id: "whale", label: "Whale Shipment", chips: 10_000_000, price: "$499.99", featured: false, hue: "gold" as const },
];

const TXN_HISTORY = [
  { id: "#RS-9921-X", type: "High Roller Vault", icon: "shopping_bag", iconColor: "text-primary", date: "Oct 24, 2026 • 14:22", amount: 1_500_000, sign: "+" as const },
  { id: "#RS-8720-A", type: "Tournament Buy-in", icon: "style", iconColor: "text-secondary", date: "Oct 22, 2026 • 09:15", amount: 100_000, sign: "-" as const },
  { id: "#RS-8401-B", type: "Daily Stack Bonus", icon: "redeem", iconColor: "text-primary", date: "Oct 21, 2026 • 00:05", amount: 5_000, sign: "+" as const },
];

export function CashierClient({ initialBankroll, initialLastClaimAt }: Props) {
  const [bankroll, setBankroll] = useState(initialBankroll);
  const [lastClaimAt, setLastClaimAt] = useState<number | null>(initialLastClaimAt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const now = Date.now();
  const canClaim = !lastClaimAt || now - lastClaimAt >= COOLDOWN_MS;
  const nextClaimAt = lastClaimAt ? lastClaimAt + COOLDOWN_MS : null;

  const claim = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cashier/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed");
        if (data.nextClaimAt) setLastClaimAt(data.nextClaimAt - COOLDOWN_MS);
      } else {
        setBankroll(data.bankroll);
        setLastClaimAt(Date.now());
        setMessage(`+${formatChips(data.awarded)} added to your bankroll`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-display-lg text-on-background mb-2">Vault &amp; Rewards</h1>
        <p className="font-body text-body-md text-on-surface-variant max-w-2xl">
          Manage your liquid assets, track competitive winnings, and secure daily loyalty bonuses in your encrypted royal vault.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Daily Reward Card */}
        <div className="md:col-span-8 glass-panel rounded-xl p-8 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="bg-secondary-container/20 text-secondary px-3 py-1 rounded-full font-label text-label-caps border border-secondary/20">
                LOYALTY BONUS
              </span>
            </div>
            <h2 className="font-display text-headline-md mb-2">Claim Your Daily Stack</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-8 max-w-md">
              Maintaining your streak increases the multiplier. Come back tomorrow for the Diamond Chest.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <DayChip day={1} state="done" />
              <DayChip day={2} state={canClaim ? "active" : "done"} />
              <DayChip day={3} state="locked" />
              <DayChip day={4} state="locked" />
              <DayChip day={5} state="diamond" />
            </div>
            <button
              type="button"
              disabled={!canClaim || busy}
              onClick={claim}
              className="bg-primary text-on-primary px-8 py-4 rounded-lg font-bold font-label text-label-caps shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "CLAIMING..." : canClaim ? `CLAIM ${formatChips(DAILY_AMOUNT)} NOW` : "ALREADY CLAIMED"}
            </button>
            {!canClaim && nextClaimAt && (
              <p className="text-xs text-on-surface-variant mt-3">
                Next claim available: {new Date(nextClaimAt).toLocaleString()}
              </p>
            )}
            {message && <p className="text-sm text-primary mt-3">{message}</p>}
          </div>
          {/* Decor: gold-tinted radial gradient instead of stock photo */}
          <div
            className="absolute right-0 bottom-0 top-0 w-1/2 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 70% 50%, rgba(217,119,6,0.6) 0%, rgba(217,119,6,0.15) 40%, transparent 75%)",
            }}
          />
        </div>

        {/* Vault Liquidity Card */}
        <div className="md:col-span-4 glass-panel rounded-xl p-8 flex flex-col justify-between border-primary/10">
          <div>
            <p className="font-label text-label-caps text-on-surface-variant mb-4">VAULT LIQUIDITY</p>
            <h3 className="font-stat text-[40px] text-primary mb-2 leading-none">{formatChips(bankroll)}</h3>
            <div className="flex items-center gap-2 text-primary">
              <Icon name="trending_up" className="text-[16px]" />
              <span className="font-label text-label-caps">+12.4% THIS WEEK</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-on-surface-variant font-label text-label-caps">PLAYER RANK</span>
              <span className="text-secondary font-label text-label-caps">ROYAL FLUSH III</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary h-full w-3/4 rounded-full" />
            </div>
          </div>
        </div>

        {/* Acquire Chips */}
        <div className="md:col-span-12 mt-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-headline-sm">Acquire Chips</h2>
            <span className="text-primary font-label text-label-caps border-b border-primary/40 cursor-pointer">
              VIEW ALL BUNDLES
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {BUNDLES.map((b) => (
              <BundleCard key={b.id} bundle={b} />
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="md:col-span-12 mt-8">
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-display text-headline-sm">Transaction History</h3>
              <div className="flex gap-2 sm:gap-4">
                <button className="font-label text-label-caps text-primary border border-primary/20 px-4 py-1.5 rounded-full hover:bg-primary/10 transition-all">ALL</button>
                <button className="font-label text-label-caps text-on-surface-variant px-4 py-1.5 rounded-full hover:text-on-surface transition-all">PURCHASES</button>
                <button className="font-label text-label-caps text-on-surface-variant px-4 py-1.5 rounded-full hover:text-on-surface transition-all">WINNINGS</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-on-surface-variant font-label text-label-caps border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-bold">Transaction ID</th>
                    <th className="px-6 py-4 font-bold">Type</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Amount</th>
                    <th className="px-6 py-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {TXN_HISTORY.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-6 py-4 text-on-surface font-stat">{t.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Icon name={t.icon} className={`${t.iconColor} text-[18px]`} />
                          <span>{t.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{t.date}</td>
                      <td className={`px-6 py-4 font-bold ${t.sign === "+" ? "text-primary" : "text-error"}`}>
                        {t.sign}
                        {formatChips(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded text-[11px] font-bold">
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DayChip({ day, state }: { day: number; state: "done" | "active" | "locked" | "diamond" }) {
  if (state === "diamond") {
    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-secondary-container/20 rounded-lg border border-secondary/30 min-w-[80px] opacity-40">
        <Icon name="diamond" className="text-secondary" />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-primary-container/20 rounded-lg border border-primary/30 min-w-[80px] shadow-[0_0_20px_rgba(104,219,169,0.15)]">
        <span className="font-label text-label-caps text-primary">Day {day}</span>
        <Icon name="stars" filled className="text-primary" />
      </div>
    );
  }
  if (state === "locked") {
    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-surface-container-highest/40 rounded-lg border border-white/5 min-w-[80px] opacity-40">
        <span className="font-label text-label-caps text-on-surface-variant">Day {day}</span>
        <Icon name="lock" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-surface-container-highest/40 rounded-lg border border-white/5 min-w-[80px]">
      <span className="font-label text-label-caps text-on-surface-variant">Day {day}</span>
      <Icon name="check_circle" className="text-primary" />
    </div>
  );
}

type BundleHue = "neutral" | "blue" | "primary" | "gold";

function BundleCard({ bundle }: { bundle: { id: string; label: string; chips: number; price: string; featured: boolean; hue: BundleHue } }) {
  const featuredClass = bundle.featured
    ? "bg-surface-container rounded-xl border border-primary/40 p-6 relative ring-1 ring-primary/20"
    : "bg-surface-container rounded-xl border border-white/5 p-6 hover:border-primary/30 transition-all";

  const hueGradient = {
    neutral: "from-surface-container-highest/30 via-surface-container/40 to-surface-container-low",
    blue: "from-blue-900/40 via-blue-950/30 to-surface-container-low",
    primary: "from-primary/30 via-primary-container/20 to-surface-container-low",
    gold: "from-secondary-container/40 via-secondary/10 to-surface-container-low",
  }[bundle.hue];

  return (
    <div className={featuredClass}>
      {bundle.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-tighter">
          BEST VALUE
        </div>
      )}
      <div
        className={`w-full h-40 rounded-lg mb-4 relative overflow-hidden bg-gradient-to-br ${hueGradient} flex items-center justify-center`}
      >
        <Icon
          name="casino"
          filled
          className={`text-[80px] ${bundle.featured ? "text-primary" : "text-on-surface-variant"} opacity-50`}
        />
      </div>
      <p className={`font-label text-label-caps mb-1 ${bundle.featured ? "text-primary" : "text-on-surface-variant"}`}>
        {bundle.label.toUpperCase()}
      </p>
      <h4 className="font-display text-[20px] mb-4">{formatChips(bundle.chips)}</h4>
      <button
        className={`w-full py-3 rounded-lg font-bold font-label text-label-caps transition-colors ${
          bundle.featured
            ? "bg-primary text-on-primary hover:brightness-110"
            : "bg-surface-container-highest text-on-surface border border-white/10 hover:bg-white/10"
        }`}
      >
        {bundle.price}
      </button>
    </div>
  );
}
