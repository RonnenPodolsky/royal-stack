import { bestOfSeven } from "./evaluator";
import type { Action, Card, GameState } from "./types";

function preflopStrength(hole: [Card, Card]): number {
  const [a, b] = hole[0].r >= hole[1].r ? hole : [hole[1], hole[0]];
  const isPair = a.r === b.r;
  const suited = a.s === b.s;
  const gap = a.r - b.r;

  let points: number;
  if (a.r === 14) points = 10;
  else if (a.r === 13) points = 8;
  else if (a.r === 12) points = 7;
  else if (a.r === 11) points = 6;
  else points = a.r / 2;

  if (isPair) points = Math.max(points * 2, 5);
  if (suited) points += 2;
  if (gap === 1) points += 1;
  else if (gap === 2) points -= 1;
  else if (gap === 3) points -= 2;
  else if (gap >= 4) points -= 5;
  if (a.r < 12 && gap <= 1 && !isPair) points += 1;

  return Math.max(0, Math.min(1, points / 22));
}

function postflopStrength(hole: [Card, Card], board: Card[]): number {
  const seven: Card[] = [...hole, ...board];
  // bestOfSeven needs exactly 7 cards. With <5 board cards we fall back to hole only.
  if (seven.length < 5) return preflopStrength(hole);
  if (seven.length === 5) {
    const r = bestOfSeven([...seven, ...seven].slice(0, 7) as Card[]);
    return categoryToScore(r.category);
  }
  if (seven.length === 6) {
    // Pad with a duplicate that won't make a hand worse — evaluator handles 7.
    const r = bestOfSeven([...seven, seven[0]]);
    return categoryToScore(r.category);
  }
  const r = bestOfSeven(seven);
  return categoryToScore(r.category);
}

function categoryToScore(cat: number): number {
  return [0.18, 0.45, 0.62, 0.76, 0.85, 0.9, 0.95, 0.99, 1.0][cat] ?? 0.2;
}

export function botAction(state: GameState, seatIdx: number): Action {
  const seat = state.seats[seatIdx];
  if (!seat.hole) return { type: "fold" };

  const strength =
    state.street === "preflop"
      ? preflopStrength(seat.hole)
      : postflopStrength(seat.hole, state.board);

  const noise = (Math.random() - 0.5) * 0.1;
  const score = Math.max(0, Math.min(1, strength + noise));

  const toCall = state.currentBet - seat.betThisStreet;
  const potOdds = toCall > 0 ? toCall / (state.pot + toCall) : 0;

  if (toCall === 0) {
    // Can check. Bet if strong.
    if (score > 0.75 && Math.random() < 0.6) {
      const betSize = Math.min(seat.stack, Math.floor(state.pot * 0.66) || state.bigBlind);
      if (betSize >= state.bigBlind) return { type: "bet", amount: betSize };
    }
    return { type: "check" };
  }

  // Facing a bet
  if (score < potOdds + 0.05) {
    // Worse than pot odds → fold
    return { type: "fold" };
  }
  if (score > 0.85 && Math.random() < 0.5) {
    // Strong hand → raise
    const target = Math.min(
      seat.stack + seat.betThisStreet,
      state.currentBet + Math.max(state.minRaise, Math.floor(state.pot * 0.6)),
    );
    if (target - seat.betThisStreet >= seat.stack) return { type: "allin" };
    if (target > state.currentBet + state.minRaise - 1) {
      return { type: "raise", amount: target };
    }
  }
  if (toCall >= seat.stack) return { type: "allin" };
  return { type: "call" };
}
