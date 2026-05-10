"use client";

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/poker/types";
import { formatChips } from "@/lib/format";

type Props = {
  state: GameState;
  mySeatIdx: number;
  busy: boolean;
  onAction: (action:
    | { type: "fold" }
    | { type: "check" }
    | { type: "call" }
    | { type: "bet"; amount: number }
    | { type: "raise"; amount: number }
    | { type: "allin" }) => void;
};

export function ActionBar({ state, mySeatIdx, busy, onAction }: Props) {
  const me = state.seats[mySeatIdx];
  const isMyTurn = state.toActIdx === mySeatIdx && state.street !== "ended";
  const toCall = Math.max(0, state.currentBet - me.betThisStreet);
  const canCheck = toCall === 0;
  const canBet = state.currentBet === 0;
  const canRaise = state.currentBet > 0;
  const minTotal = canRaise ? state.currentBet + state.minRaise : state.bigBlind;
  const maxTotal = me.stack + me.betThisStreet;

  const initial = Math.min(maxTotal, Math.max(minTotal, state.bigBlind * 2));
  const [target, setTarget] = useState<number>(initial);

  useEffect(() => {
    setTarget(Math.min(maxTotal, Math.max(minTotal, target)));
  }, [minTotal, maxTotal, target]);

  if (state.street === "ended") {
    return (
      <div className="fixed bottom-0 left-0 w-full glass-panel border-t border-white/5 px-6 py-6 z-50 flex items-center justify-center">
        <p className="text-on-surface-variant text-sm">Hand ended — dealing next hand…</p>
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="fixed bottom-0 left-0 w-full glass-panel border-t border-white/5 px-6 py-6 z-50 flex items-center justify-center">
        <p className="text-on-surface-variant text-sm">Waiting on {state.seats[state.toActIdx]?.displayName ?? "opponent"}…</p>
      </div>
    );
  }

  const submit = (a: Parameters<typeof onAction>[0]) => {
    if (busy) return;
    onAction(a);
  };

  const sliderStep = Math.max(1, Math.floor(state.bigBlind / 2));
  const potBet = (frac: number) => {
    const desired = state.currentBet + Math.floor(state.pot * frac);
    setTarget(Math.min(maxTotal, Math.max(minTotal, desired)));
  };

  return (
    <div className="fixed bottom-0 left-0 w-full glass-panel border-t border-white/5 px-6 py-6 z-50">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-stretch gap-6">
        <div className="flex gap-3 w-full md:w-auto">
          <button
            disabled={busy}
            onClick={() => submit({ type: "fold" })}
            className="flex-1 md:w-32 py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-display text-headline-sm text-on-surface-variant active:scale-95 disabled:opacity-50"
          >
            FOLD
          </button>
          {canCheck ? (
            <button
              disabled={busy}
              onClick={() => submit({ type: "check" })}
              className="flex-1 md:w-32 py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-display text-headline-sm text-on-surface active:scale-95 disabled:opacity-50"
            >
              CHECK
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => {
                if (toCall >= me.stack) submit({ type: "allin" });
                else submit({ type: "call" });
              }}
              className="flex-1 md:w-40 py-4 rounded-xl bg-gradient-to-b from-primary-container to-inverse-primary border-t border-white/20 shadow-[0_4px_15px_rgba(37,164,117,0.3)] font-display text-headline-sm text-on-primary active:scale-95 disabled:opacity-50"
            >
              CALL {formatChips(Math.min(toCall, me.stack))}
            </button>
          )}
        </div>
        <div className="flex-1 w-full flex flex-col gap-3">
          <div className="flex justify-between items-center px-2">
            <span className="font-label text-label-caps text-on-surface-variant">
              {canBet ? "BET" : "RAISE TO"}
            </span>
            <span className="font-stat text-xl text-secondary">{formatChips(target)}</span>
          </div>
          <input
            type="range"
            min={minTotal}
            max={maxTotal}
            step={sliderStep}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full accent-secondary"
          />
          <div className="flex flex-wrap gap-2 justify-between">
            <button
              onClick={() => setTarget(minTotal)}
              className="px-3 py-1 rounded bg-white/5 text-[10px] font-label text-on-surface-variant hover:text-white"
            >
              MIN
            </button>
            <button
              onClick={() => potBet(0.5)}
              className="px-3 py-1 rounded bg-white/5 text-[10px] font-label text-on-surface-variant hover:text-white"
            >
              ½ POT
            </button>
            <button
              onClick={() => potBet(0.75)}
              className="px-3 py-1 rounded bg-white/5 text-[10px] font-label text-on-surface-variant hover:text-white"
            >
              ¾ POT
            </button>
            <button
              onClick={() => potBet(1)}
              className="px-3 py-1 rounded bg-white/5 text-[10px] font-label text-on-surface-variant hover:text-white"
            >
              POT
            </button>
            <button
              onClick={() => setTarget(maxTotal)}
              className="px-3 py-1 rounded bg-secondary/10 text-[10px] font-label text-secondary hover:bg-secondary/20"
            >
              ALL-IN
            </button>
            <button
              disabled={busy || target < minTotal || target > maxTotal}
              onClick={() => {
                if (target >= maxTotal) submit({ type: "allin" });
                else if (canBet) submit({ type: "bet", amount: target });
                else submit({ type: "raise", amount: target });
              }}
              className="ml-auto px-6 py-2 rounded-md bg-secondary text-on-secondary font-display text-sm shadow-[0_0_15px_rgba(217,119,6,0.4)] active:scale-95 disabled:opacity-50"
            >
              {canBet ? "BET" : "RAISE"} {formatChips(target)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
