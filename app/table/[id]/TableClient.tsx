"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Action, GameState } from "@/lib/poker/types";
import { Seat, pileLayout } from "@/components/poker/Seat";
import { PlayingCard } from "@/components/poker/Card";
import { ActionBar } from "@/components/poker/ActionBar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { formatChips } from "@/lib/format";

type Props = {
  tableId: string;
  initialState: GameState;
  initialMySeatIdx: number;
  initialBankroll: number;
  username: string;
  email?: string;
  avatarUrl?: string;
};

export function TableClient({ tableId, initialState, initialMySeatIdx, initialBankroll, username, email, avatarUrl }: Props) {
  const [state, setState] = useState<GameState>(initialState);
  const [mySeatIdx, setMySeatIdx] = useState<number>(initialMySeatIdx);
  const [bankroll, setBankroll] = useState<number>(initialBankroll);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/table/${tableId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.state) setState(data.state);
      if (typeof data.mySeatIdx === "number") setMySeatIdx(data.mySeatIdx);
      if (typeof data.bankroll === "number") setBankroll(data.bankroll);
    } catch {
      // ignore transient
    }
  }, [tableId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const isMyTurn = stateRef.current.toActIdx === mySeatIdx && stateRef.current.street !== "ended";
      // poll faster when waiting for bots, slower when it's our turn
      if (!isMyTurn) refresh();
    }, 1200);
    return () => clearInterval(interval);
  }, [refresh, mySeatIdx]);

  const sendAction = useCallback(
    async (action: Action) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/table/${tableId}/act`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(action),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Action failed");
        } else {
          if (data.state) setState(data.state);
          if (typeof data.mySeatIdx === "number") setMySeatIdx(data.mySeatIdx);
        }
      } catch (e) {
        setError("Network error");
      } finally {
        setBusy(false);
      }
    },
    [tableId],
  );

  const total = state.seats.length;
  const positions = pileLayout(total);

  // Identify dealer/SB/BB seat indices
  const dealerIdx = state.dealerIdx;
  const activeCount = state.seats.filter((s) => s.status === "active" || s.status === "allin").length;
  let sbIdx = -1;
  let bbIdx = -1;
  if (activeCount === 2) {
    sbIdx = dealerIdx;
    // BB is the next non-folded
    for (let i = 1; i <= total; i++) {
      const idx = (dealerIdx + i) % total;
      if (state.seats[idx].status !== "folded") {
        bbIdx = idx;
        break;
      }
    }
  } else {
    for (let i = 1; i <= total; i++) {
      const idx = (dealerIdx + i) % total;
      if (state.seats[idx].status !== "folded") {
        if (sbIdx === -1) sbIdx = idx;
        else if (bbIdx === -1) {
          bbIdx = idx;
          break;
        }
      }
    }
  }

  return (
    <>
      <TopBar
        bankroll={bankroll}
        username={username}
        email={email}
        avatarUrl={avatarUrl}
        active="tables"
        balanceTone="secondary"
      />
      <main className="relative h-screen w-full flex flex-col items-center justify-start pt-20 pb-44 overflow-hidden">
        <div className="w-full max-w-[1100px] flex-1 relative px-4 mx-auto">
          <div className="poker-table-felt relative w-full aspect-[16/9] rounded-[200px] border-[12px] border-[#2d2016]">
            <div className="absolute inset-0 rounded-[188px] border-[1px] border-white/10 pointer-events-none" />

            {/* Pot + board */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
              {state.board.length > 0 && (
                <div className="flex gap-2">
                  {state.board.map((c, i) => (
                    <PlayingCard key={i} card={c} size="md" />
                  ))}
                </div>
              )}
              <div className="text-center">
                <p className="font-label text-label-caps text-on-surface-variant opacity-60">
                  CURRENT POT
                </p>
                <p className="font-stat text-[28px] text-secondary">{formatChips(state.pot)}</p>
              </div>
            </div>

            {/* Seats */}
            {state.seats.map((seat, idx) => {
              const pos = positions[idx];
              if (!pos) return null;
              return (
                <div
                  key={seat.id}
                  className="absolute"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <Seat
                    seat={seat}
                    isMe={idx === mySeatIdx}
                    isToAct={state.toActIdx === idx && state.street !== "ended"}
                    isDealer={idx === dealerIdx}
                    isSB={idx === sbIdx}
                    isBB={idx === bbIdx}
                  />
                </div>
              );
            })}

            {/* Chip stacks placed between each betting seat and the pot */}
            {state.seats.map((seat, idx) => {
              const pos = positions[idx];
              if (!pos || seat.betThisStreet <= 0) return null;
              const seatLeft = parseFloat(pos.left);
              const seatTop = parseFloat(pos.top);
              // 40% of the way from the seat toward the table center.
              const chipLeft = seatLeft + (50 - seatLeft) * 0.4;
              const chipTop = seatTop + (50 - seatTop) * 0.4;
              return (
                <div
                  key={`bet-${seat.id}`}
                  className="absolute z-20"
                  style={{
                    left: `${chipLeft}%`,
                    top: `${chipTop}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <ChipStack amount={seat.betThisStreet} />
                </div>
              );
            })}

            {/* Winner banner at hand end */}
            {state.street === "ended" && state.lastShowdown && state.lastShowdown.winners.length > 0 && (
              <WinnerBanner state={state} />
            )}
          </div>

          {/* Hand log + leave */}
          <div className="hidden xl:flex fixed top-20 left-6 flex-col gap-4 z-40">
            <div className="glass-panel-dense p-4 rounded-xl border border-white/5 w-64 max-h-80 overflow-y-auto">
              <h3 className="font-label text-label-caps text-primary mb-3">HAND LOG</h3>
              <div className="space-y-1 text-xs">
                {state.log.slice(-12).map((entry, i) => (
                  <p key={i} className="text-on-surface-variant">
                    <span className="text-primary/60">[H{entry.handNumber}]</span> {entry.message}
                  </p>
                ))}
              </div>
            </div>
            <Link
              href="/lobby"
              className="glass-panel-dense flex items-center gap-2 p-3 rounded-xl border border-white/5 text-on-surface-variant hover:text-primary text-sm"
            >
              <Icon name="logout" />
              <span>Leave Table</span>
            </Link>
          </div>

          {/* Live chat (visual only) */}
          <div className="hidden xl:flex fixed top-20 right-6 flex-col gap-4 z-40">
            <div className="glass-panel-dense p-4 rounded-xl border border-white/5 w-64">
              <h3 className="font-label text-label-caps text-primary mb-3">LIVE CHAT</h3>
              <div className="h-40 overflow-y-auto space-y-3 mb-3 pr-2">
                {state.log.slice(-4).map((entry, i) => (
                  <p key={i} className="text-xs">
                    <span className="text-on-surface-variant">{entry.message}</span>
                  </p>
                ))}
                {state.log.length === 0 && (
                  <p className="text-xs text-on-surface-variant italic">No chat yet — make a move…</p>
                )}
              </div>
              <div className="relative">
                <input
                  className="w-full bg-surface-container border-none rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="Send message..."
                  type="text"
                  disabled
                />
                <Icon name="send" className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
              </div>
            </div>
          </div>

          {error && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-error-container/90 border border-error/40 text-on-error-container px-4 py-2 rounded-lg text-sm z-50">
              {error}
            </div>
          )}
        </div>
      </main>
      <ActionBar state={state} mySeatIdx={mySeatIdx} busy={busy} onAction={sendAction} />
      <BottomNav active="tables" />
    </>
  );
}

function ChipStack({ amount }: { amount: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-7 h-5">
        <div className="absolute inset-x-0 bottom-0 h-2 rounded-full bg-gradient-to-b from-secondary-fixed to-secondary border border-white/30 shadow-md" />
        <div className="absolute inset-x-0 bottom-1.5 h-2 rounded-full bg-gradient-to-b from-secondary to-secondary-container border border-white/30 shadow-md" />
        <div className="absolute inset-x-0 bottom-3 h-2 rounded-full bg-gradient-to-b from-secondary-fixed to-secondary border border-white/30 shadow-md" />
      </div>
      <span className="font-stat text-secondary text-[11px] bg-surface/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
        {formatChips(amount)}
      </span>
    </div>
  );
}

function WinnerBanner({ state }: { state: GameState }) {
  if (!state.lastShowdown) return null;
  const winners = state.lastShowdown.winners;
  const total = winners.reduce((sum, w) => sum + w.amount, 0);
  // Group winners by seatIdx to show one row per player (multi-pot splits).
  const byIdx = new Map<number, { amount: number; bestHand?: typeof winners[number]["bestHand"] }>();
  for (const w of winners) {
    const prev = byIdx.get(w.seatIdx);
    byIdx.set(w.seatIdx, {
      amount: (prev?.amount ?? 0) + w.amount,
      bestHand: w.bestHand ?? prev?.bestHand,
    });
  }
  const handLabel: string[] = [
    "High Card",
    "Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush",
  ];
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[150%] z-40 pointer-events-none">
      <div className="bg-gradient-to-r from-secondary/20 via-secondary/40 to-secondary/20 border-2 border-secondary px-8 py-4 rounded-xl shadow-[0_0_40px_rgba(217,119,6,0.55)] backdrop-blur-md min-w-[280px]">
        <p className="font-label text-label-caps text-secondary text-center mb-2">WINNER</p>
        <div className="space-y-1">
          {Array.from(byIdx.entries()).map(([idx, info]) => {
            const seat = state.seats[idx];
            return (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-headline-sm text-white leading-tight">{seat.displayName}</p>
                  {info.bestHand && (
                    <p className="text-[11px] text-secondary/80">{handLabel[info.bestHand.category]}</p>
                  )}
                </div>
                <p className="font-stat text-stat-lg text-secondary">+{formatChips(info.amount)}</p>
              </div>
            );
          })}
        </div>
        {byIdx.size > 1 && (
          <p className="text-[10px] text-on-surface-variant text-center mt-2">
            Split pot — total {formatChips(total)}
          </p>
        )}
      </div>
    </div>
  );
}
