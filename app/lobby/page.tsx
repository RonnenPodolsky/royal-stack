import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { TABLES, type TableSpec } from "@/lib/tables";
import { formatChips } from "@/lib/format";
import { getOrCreateSessionUser } from "@/lib/server/session";

export default async function LobbyPage() {
  const user = await getOrCreateSessionUser();
  return (
    <>
      <TopBar bankroll={user.bankroll} username={user.displayName} active="lobby" />
      <SideNav active="lobby" />
      <BottomNav active="lobby" />
      <main className="lg:ml-64 pt-16 pb-24 md:pb-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <Hero />
          <BrowserControls />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {TABLES.map((t) => (
              <TableCard key={t.id} table={t} />
            ))}
            <CreateTableCard />
          </div>
        </div>
      </main>
      <FloatingActionButton />
    </>
  );
}

function Hero() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-10">
      <div className="col-span-1 md:col-span-2 relative h-48 rounded-xl overflow-hidden glass-panel group">
        <div
          className="absolute inset-0 opacity-50 group-hover:scale-105 transition-transform duration-700"
          style={{
            background:
              "radial-gradient(ellipse at top right, #25a475 0%, #064e3b 35%, #022c22 70%, #0a0f0c 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface to-transparent p-8 flex flex-col justify-center">
          <span className="text-primary font-label text-label-caps mb-2">FEATURED EVENT</span>
          <h1 className="text-display-lg font-display text-white mb-1">
            High Roller Invitational
          </h1>
          <p className="text-on-surface-variant max-w-md">
            $2M Guaranteed • Top 50 Qualifiers
          </p>
        </div>
      </div>
      <div className="col-span-1 glass-panel rounded-xl p-8 flex flex-col justify-center border-l-4 border-primary inner-glow-green">
        <span className="text-on-surface-variant font-label text-label-caps mb-2">
          Total Active Players
        </span>
        <span className="text-display-lg font-stat text-primary">12,482</span>
        <div className="mt-4 flex -space-x-3">
          <AvatarDot color="bg-secondary-container" letter="A" />
          <AvatarDot color="bg-primary-container" letter="K" />
          <AvatarDot color="bg-tertiary-container" letter="V" />
          <div className="w-8 h-8 rounded-full border-2 border-surface bg-primary-container flex items-center justify-center text-[10px] font-bold text-on-primary-container">
            +4k
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarDot({ color, letter }: { color: string; letter: string }) {
  return (
    <div className={`w-8 h-8 rounded-full border-2 border-surface ${color} flex items-center justify-center text-[10px] font-bold text-white/80`}>
      {letter}
    </div>
  );
}

function BrowserControls() {
  return (
    <div className="flex flex-col md:flex-row gap-gutter mb-8 items-stretch md:items-center">
      <div className="w-full md:w-1/3 glass-panel rounded-lg flex items-center px-4 py-3">
        <Icon name="search" className="text-on-surface-variant mr-3" />
        <input
          className="bg-transparent border-none text-on-surface focus:ring-0 focus:outline-none w-full"
          placeholder="Search tables, stakes, or players..."
          type="text"
        />
      </div>
      <div className="flex-1 flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        <div className="flex bg-surface-container rounded-lg p-1">
          <button className="px-6 py-2 rounded-md bg-primary text-on-primary font-label text-label-caps shadow-lg">
            Cash Games
          </button>
          <button className="px-6 py-2 rounded-md text-on-surface-variant font-label text-label-caps hover:text-white transition-colors opacity-50 cursor-not-allowed">
            Tournaments
          </button>
        </div>
        <div className="flex bg-surface-container rounded-lg p-1">
          <button className="px-4 py-2 text-on-surface-variant font-label text-label-caps hover:text-white">Low</button>
          <button className="px-4 py-2 bg-surface-container-highest rounded-md text-primary font-label text-label-caps">Mid</button>
          <button className="px-4 py-2 text-on-surface-variant font-label text-label-caps hover:text-white">High</button>
        </div>
        <div className="flex bg-surface-container rounded-lg p-1">
          <button className="px-4 py-2 bg-surface-container-highest rounded-md text-primary font-label text-label-caps">Texas Hold&apos;em</button>
          <button className="px-4 py-2 text-on-surface-variant font-label text-label-caps hover:text-white">Omaha</button>
        </div>
      </div>
    </div>
  );
}

const TIER_LABEL: Record<string, string> = {
  low: "Low Stakes",
  mid: "Mid Stakes",
  high: "High Stakes",
  vip: "VIP Invitational",
};

function gameLabel(t: TableSpec): string {
  const game = t.game === "omaha" ? "Omaha" : "Texas Hold'em";
  const limit = t.limit === "pot-limit" ? "Pot Limit" : "No Limit";
  return `${game} • ${limit}`;
}

function TableCard({ table }: { table: TableSpec }) {
  const isVip = table.tier === "vip";
  const isFull = table.state === "full";
  const isInviteOnly = table.state === "invite-only";

  const stakeColor = isVip ? "text-secondary" : "text-primary";
  const dotColor = isVip ? "bg-secondary" : "bg-primary";
  const dotPulse = !isVip && !isFull;

  const cardClass = isVip
    ? "glass-panel rounded-xl overflow-hidden border-2 border-secondary/20 hover:border-secondary transition-all duration-300 group"
    : "glass-panel rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 group";

  return (
    <div className={cardClass}>
      {!isVip && (
        <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}
      {isVip && (
        <div className="bg-secondary/10 px-6 py-2 flex items-center gap-2">
          <Icon name="stars" className="text-secondary text-sm" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">
            VIP Invitational
          </span>
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-headline-sm font-display text-white">{table.name}</h3>
            <p className="text-on-surface-variant text-sm flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dotColor} ${dotPulse ? "animate-pulse" : ""}`} />
              {gameLabel(table)}
            </p>
          </div>
          {!isVip && (
            <span
              className={
                table.tier === "high"
                  ? "bg-secondary-container/20 text-secondary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-secondary/20"
                  : "bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/5"
              }
            >
              {TIER_LABEL[table.tier]}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface-container rounded-lg p-3">
            <p className="text-[10px] text-on-surface-variant uppercase">Stakes</p>
            <p className={`font-stat text-stat-lg ${stakeColor}`}>
              {formatChips(table.smallBlind)} / {formatChips(table.bigBlind)}
            </p>
          </div>
          <div className="bg-surface-container rounded-lg p-3">
            <p className="text-[10px] text-on-surface-variant uppercase">Min Buy-in</p>
            <p className={`font-stat text-stat-lg ${stakeColor}`}>{formatChips(table.minBuyIn)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          {isInviteOnly ? (
            <div className="flex items-center gap-2">
              <Icon name="lock" className="text-on-surface-variant" />
              <span className="text-sm text-on-surface-variant font-bold">Invite Only</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Icon name="group" className="text-on-surface-variant" />
              <span className="text-sm text-on-surface-variant">
                {table.displaySeatsFilled} / {table.displaySeatsTotal} Players
              </span>
            </div>
          )}
          {isFull ? (
            <div className="bg-error-container/20 text-error px-2 py-0.5 rounded text-[10px] font-bold uppercase">
              Table Full
            </div>
          ) : !isInviteOnly ? (
            <SeatDots count={Math.min(3, table.displaySeatsFilled)} />
          ) : (
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border border-surface bg-secondary-container/40" />
              <div className="w-6 h-6 rounded-full border border-surface bg-secondary-container/30" />
            </div>
          )}
        </div>
        <CardActions table={table} />
      </div>
    </div>
  );
}

function SeatDots({ count }: { count: number }) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-6 h-6 rounded-full border border-surface ${
            i === count - 1 ? "bg-primary-container/40" : "bg-surface-container-highest"
          }`}
        />
      ))}
    </div>
  );
}

function CardActions({ table }: { table: TableSpec }) {
  const isVip = table.tier === "vip";
  const isFull = table.state === "full";
  const isInviteOnly = table.state === "invite-only";

  if (isInviteOnly) {
    return (
      <div className="flex gap-3">
        <button className="flex-1 bg-secondary text-on-secondary font-display text-headline-sm py-3 rounded-lg active:scale-95 transition-all shadow-[0_0_20px_rgba(217,119,6,0.2)]">
          Request Seat
        </button>
      </div>
    );
  }
  if (isFull) {
    return (
      <div className="flex gap-3">
        <button
          disabled
          className="flex-1 bg-surface-container-highest text-on-surface-variant font-display text-headline-sm py-3 rounded-lg cursor-not-allowed"
        >
          Waitlist
        </button>
        <button className="px-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
          <Icon name="visibility" className="text-on-surface-variant" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Link
        href={`/table/${table.id}`}
        className={`flex-1 text-center font-display text-headline-sm py-3 rounded-lg active:scale-95 transition-all ${
          isVip
            ? "bg-secondary text-on-secondary shadow-[0_0_20px_rgba(217,119,6,0.2)]"
            : "bg-primary text-on-primary shadow-[0_0_20px_rgba(104,219,169,0.2)]"
        }`}
      >
        Quick Join
      </Link>
      <button className="px-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
        <Icon name="visibility" className="text-on-surface-variant" />
      </button>
    </div>
  );
}

function CreateTableCard() {
  return (
    <div className="border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center p-8 group hover:border-primary/30 hover:bg-primary/5 transition-all cursor-not-allowed opacity-60">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon name="add" className="text-primary" />
      </div>
      <span className="text-headline-sm font-display text-on-surface-variant group-hover:text-primary transition-colors">
        Create Table
      </span>
      <p className="text-on-surface-variant text-sm mt-2 opacity-50">Private or Public sessions</p>
    </div>
  );
}

function FloatingActionButton() {
  return (
    <Link
      href="/table/the-royal-suite"
      className="fixed right-6 bottom-20 md:bottom-12 lg:right-12 z-40 w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_8px_32px_rgba(104,219,169,0.4)] hover:scale-110 active:scale-95 transition-all"
      aria-label="Quick play"
    >
      <Icon name="play_arrow" className="text-3xl" />
    </Link>
  );
}
