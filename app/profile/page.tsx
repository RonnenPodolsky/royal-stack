import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { getOrCreateSessionUser, isAuthenticated } from "@/lib/server/session";
import { formatChips } from "@/lib/format";

export default async function ProfilePage() {
  if (!(await isAuthenticated())) {
    redirect("/login?callbackUrl=%2Fprofile");
  }
  const user = await getOrCreateSessionUser();
  const netProfit = user.netProfit || 4210;
  const hands = user.handsPlayed || 142;
  return (
    <>
      <TopBar bankroll={user.bankroll} username={user.displayName} active="profile" />
      <SideNav active="profile" />
      <BottomNav active="stats" />
      <main className="lg:pl-64 pt-20 pb-24 md:pb-8 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto">
        {/* Header */}
        <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-display-lg text-primary mb-2">Player Profile</h1>
            <p className="text-on-surface-variant font-body text-body-md max-w-2xl">
              Elite member since {new Date(user.createdAt).getFullYear()}. Top 1% in High-Stakes Texas Hold&apos;em. Known for precise calculations and steady aggression.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/lobby"
              className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            >
              <Icon name="play_arrow" />
              Quick Sit
            </Link>
          </div>
        </section>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Rank Card */}
          <div className="md:col-span-4 glass-panel rounded-xl p-6 flex flex-col justify-between min-h-[300px]">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label text-label-caps text-on-surface-variant">CURRENT RANK</span>
              <Icon name="stars" filled className="text-secondary" />
            </div>
            <div className="mb-8">
              <h2 className="font-display text-display-lg text-secondary">GOLD IV</h2>
              <p className="text-body-md text-on-surface-variant">Top 5,420 Players Worldwide</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between font-label text-label-caps">
                <span>PROGRESS TO PLATINUM</span>
                <span className="text-secondary">8,450 / 10,000 XP</span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[84%] rounded-full shadow-[0_0_8px_rgba(217,119,6,0.5)]" />
              </div>
            </div>
          </div>

          {/* Win/Loss Chart */}
          <div className="md:col-span-8 glass-panel rounded-xl p-6 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
              <span className="font-label text-label-caps text-on-surface-variant">
                WIN/LOSS PERFORMANCE (LAST 30 DAYS)
              </span>
              <div className="flex gap-2 items-center">
                <span className={`font-stat text-stat-lg ${netProfit >= 0 ? "text-primary" : "text-error"}`}>
                  {netProfit >= 0 ? "+" : ""}
                  {formatChips(netProfit)}
                </span>
                <span className="text-on-surface-variant opacity-50">|</span>
                <span className="text-on-surface-variant font-stat text-stat-lg">{hands} Hands</span>
              </div>
            </div>
            <div className="flex-1 flex items-end gap-1 overflow-hidden">
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 ${h.cls} hover:opacity-80 transition-colors rounded-t-sm`}
                  style={{ height: `${h.h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Most Frequent Winning Hands */}
          <div className="md:col-span-5 glass-panel rounded-xl p-6">
            <span className="font-label text-label-caps text-on-surface-variant block mb-6">
              MOST FREQUENT WINNING HANDS
            </span>
            <div className="space-y-4">
              <HandRow
                cards={[
                  { rank: "A", suit: "h", color: "red" },
                  { rank: "K", suit: "h", color: "red" },
                ]}
                name="Suited Connector"
                strategy="Big Blind Strategy"
                rate="12%"
              />
              <HandRow
                cards={[
                  { rank: "J", suit: "d", color: "black" },
                  { rank: "J", suit: "s", color: "black" },
                ]}
                name="Pocket Jacks"
                strategy="Aggressive Pre-flop"
                rate="9%"
              />
              <HandRow
                cards={[
                  { rank: "10", suit: "s", color: "black" },
                  { rank: "Q", suit: "h", color: "red" },
                ]}
                name="Hidden Straight"
                strategy="The Royal Trap"
                rate="7%"
                dim
              />
            </div>
          </div>

          {/* Achievements */}
          <div className="md:col-span-7 glass-panel rounded-xl p-6">
            <span className="font-label text-label-caps text-on-surface-variant block mb-6">VIP ACHIEVEMENTS</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Achievement icon="military_tech" label="ALL-IN ACE" caption="Win 50 All-Ins" tone="secondary" highlighted />
              <Achievement icon="monetization_on" label="WHALE" caption="1M Lifetime Win" tone="muted" />
              <Achievement icon="rocket_launch" label="HOT STREAK" caption="10 Consecutive Wins" tone="primary" />
              <Achievement icon="trophy" label="TABLE KING" caption="Final Table Win" tone="muted" />
            </div>
          </div>

          {/* Hand History */}
          <div className="md:col-span-12 glass-panel rounded-xl overflow-hidden mt-4">
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="font-label text-label-caps text-on-surface-variant">DETAILED HAND HISTORY</span>
              <div className="flex bg-surface-container rounded-lg p-1">
                <button className="px-4 py-1.5 text-xs font-bold rounded bg-surface-bright text-primary">RECENT</button>
                <button className="px-4 py-1.5 text-xs font-bold rounded text-on-surface-variant hover:text-white">BIGGEST WINS</button>
                <button className="px-4 py-1.5 text-xs font-bold rounded text-on-surface-variant hover:text-white">BAD BEATS</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high/50 font-label text-label-caps text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4 font-bold">DATE / TIME</th>
                    <th className="px-6 py-4 font-bold">TABLE NAME</th>
                    <th className="px-6 py-4 font-bold">STAKES</th>
                    <th className="px-6 py-4 font-bold">ACTION</th>
                    <th className="px-6 py-4 font-bold text-right">RESULT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <HistoryRow date="MAY 11, 2026" time="22:14:05" table="Midnight Sky" type="No-Limit Hold'em" stakes="$10 / $20" actionLabel="Showdown Win" actionTone="primary" delta={1450} />
                  <HistoryRow date="MAY 11, 2026" time="21:50:12" table="Neon District" type="Tournament" stakes="$500 Buy-in" actionLabel="Fold Pre-flop" actionTone="muted" delta={-20} />
                  <HistoryRow date="MAY 11, 2026" time="21:32:44" table="Midnight Sky" type="No-Limit Hold'em" stakes="$10 / $20" actionLabel="Loss (All-in)" actionTone="error" delta={-840} />
                  <HistoryRow date="MAY 11, 2026" time="21:10:05" table="The High Roller" type="No-Limit Hold'em" stakes="$50 / $100" actionLabel="Large Pot Win" actionTone="secondary" delta={2100} />
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-high/30 flex justify-center">
              <button className="font-label text-label-caps text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
                VIEW FULL LOG
                <Icon name="keyboard_double_arrow_down" className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const BAR_HEIGHTS: { h: number; cls: string }[] = [
  { h: 40, cls: "bg-primary/20" },
  { h: 60, cls: "bg-primary/20" },
  { h: 30, cls: "bg-error/20" },
  { h: 75, cls: "bg-primary/30" },
  { h: 90, cls: "bg-primary/40" },
  { h: 45, cls: "bg-error/30" },
  { h: 55, cls: "bg-primary/20" },
  { h: 80, cls: "bg-primary/30" },
  { h: 25, cls: "bg-error/20" },
  { h: 100, cls: "bg-primary/50" },
  { h: 40, cls: "bg-primary/20" },
  { h: 60, cls: "bg-primary/20" },
  { h: 30, cls: "bg-error/20" },
  { h: 75, cls: "bg-primary/30" },
  { h: 90, cls: "bg-primary/40" },
];

type CardData = { rank: string; suit: "h" | "d" | "s" | "c"; color: "red" | "black" };

function HandRow({ cards, name, strategy, rate, dim }: { cards: CardData[]; name: string; strategy: string; rate: string; dim?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 bg-surface-container rounded-lg border border-white/5 ${dim ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-4">
          {cards.map((c, i) => (
            <MiniCard key={i} card={c} z={i === 0 ? 10 : 0} />
          ))}
        </div>
        <div>
          <p className="text-body-md font-semibold">{name}</p>
          <p className="text-xs text-on-surface-variant">{strategy}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-stat text-stat-lg text-primary">{rate}</p>
        <p className="text-xs text-on-surface-variant">Win Rate</p>
      </div>
    </div>
  );
}

function MiniCard({ card, z }: { card: CardData; z: number }) {
  const glyph = { h: "♥", d: "♦", s: "♠", c: "♣" }[card.suit];
  const color = card.color === "red" ? "text-red-600" : "text-black";
  return (
    <div
      className={`w-10 h-14 bg-white rounded border border-black/10 flex flex-col items-center justify-center shadow-md relative`}
      style={{ zIndex: z }}
    >
      <span className={`text-xs font-bold ${color} leading-none`}>{card.rank}</span>
      <span className={`${color} text-base leading-none`}>{glyph}</span>
    </div>
  );
}

function Achievement({ icon, label, caption, tone, highlighted }: { icon: string; label: string; caption: string; tone: "secondary" | "primary" | "muted"; highlighted?: boolean }) {
  const toneClass = tone === "secondary" ? "text-secondary" : tone === "primary" ? "text-primary" : "text-on-surface-variant";
  const borderClass = highlighted
    ? tone === "secondary"
      ? "border-secondary/20 shadow-[0_0_15px_rgba(217,119,6,0.3)]"
      : "border-primary/20"
    : "border-white/5 opacity-60";
  return (
    <div className={`flex flex-col items-center text-center p-4 rounded-lg bg-surface-container-low border ${borderClass}`}>
      <div className={`w-12 h-12 mb-3 ${toneClass}`}>
        <Icon name={icon} filled className="text-[48px]" />
      </div>
      <p className={`font-label text-label-caps font-bold ${highlighted ? toneClass : ""}`}>{label}</p>
      <p className="text-[10px] text-on-surface-variant">{caption}</p>
    </div>
  );
}

function HistoryRow({ date, time, table, type, stakes, actionLabel, actionTone, delta }: { date: string; time: string; table: string; type: string; stakes: string; actionLabel: string; actionTone: "primary" | "secondary" | "error" | "muted"; delta: number }) {
  const tone = actionTone === "primary"
    ? "bg-primary-container/20 text-primary"
    : actionTone === "secondary"
    ? "bg-secondary-container/20 text-secondary"
    : actionTone === "error"
    ? "bg-error-container/20 text-error"
    : "bg-surface-container-highest text-on-surface-variant";
  const resultColor = delta > 0 ? (actionTone === "secondary" ? "text-secondary" : "text-primary") : "text-on-surface-variant";
  const sign = delta > 0 ? "+" : "";
  return (
    <tr className="hover:bg-white/5 transition-colors cursor-pointer">
      <td className="px-6 py-4">
        <p className="text-sm font-semibold">{date}</p>
        <p className="text-[10px] text-on-surface-variant">{time}</p>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-semibold">{table}</p>
        <p className="text-[10px] text-on-surface-variant">{type}</p>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-semibold">{stakes}</p>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 ${tone} text-[10px] font-bold rounded uppercase`}>{actionLabel}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <p className={`text-sm font-bold ${delta < 0 ? "text-error" : resultColor}`}>
          {sign}
          {formatChips(delta)}
        </p>
      </td>
    </tr>
  );
}
