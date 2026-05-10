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
                  {seat.betThisStreet > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 bg-secondary/20 border border-secondary/40 px-2 py-0.5 rounded-full">
                      <span className="font-stat text-secondary text-xs">
                        {formatChips(seat.betThisStreet)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
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
