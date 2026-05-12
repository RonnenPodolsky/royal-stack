import { generateObject } from "ai";
import { z } from "zod";
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

// ── AI-driven bot ────────────────────────────────────────────────────────────
// Uses Vercel AI Gateway via the AI SDK. Set AI_GATEWAY_API_KEY (or deploy on
// Vercel which provides VERCEL_OIDC_TOKEN). Defaults to a free Gateway model;
// override with POKER_BOT_MODEL=<provider/model>. Falls back to the heuristic
// on any error, missing key, or illegal model output — the game never stalls.

const DEFAULT_MODEL = "xai/grok-4-fast-non-reasoning";

const SUIT_LABEL: Record<Card["s"], string> = { c: "♣", d: "♦", h: "♥", s: "♠" };
const RANK_LABEL: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "T",
  11: "J", 12: "Q", 13: "K", 14: "A",
};

function cardLabel(c: Card): string {
  return `${RANK_LABEL[c.r]}${SUIT_LABEL[c.s]}`;
}

type LegalActions = {
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  betMin: number;
  betMax: number;
  canRaise: boolean;
  raiseMinTotal: number;
  raiseMaxTotal: number;
  canAllin: boolean;
};

function legalActions(state: GameState, seatIdx: number): LegalActions {
  const seat = state.seats[seatIdx];
  const toCall = state.currentBet - seat.betThisStreet;
  const facingBet = state.currentBet > 0;
  const canCheck = toCall <= 0;
  const canCall = toCall > 0 && seat.stack > 0;
  const canBet = !facingBet && seat.stack >= state.bigBlind;
  const minRaiseTotal = state.currentBet + state.minRaise;
  const maxRaiseTotal = seat.betThisStreet + seat.stack;
  const canRaise = facingBet && maxRaiseTotal >= minRaiseTotal;
  return {
    canCheck,
    canCall,
    callAmount: Math.min(toCall, seat.stack),
    canBet,
    betMin: state.bigBlind,
    betMax: seat.stack,
    canRaise,
    raiseMinTotal: minRaiseTotal,
    raiseMaxTotal: maxRaiseTotal,
    canAllin: seat.stack > 0,
  };
}

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fold") }),
  z.object({ type: z.literal("check") }),
  z.object({ type: z.literal("call") }),
  z.object({ type: z.literal("bet"), amount: z.number().int().positive() }),
  z.object({ type: z.literal("raise"), amount: z.number().int().positive() }),
  z.object({ type: z.literal("allin") }),
]);

function validateAgainstLegal(action: Action, legal: LegalActions, seatStack: number): boolean {
  switch (action.type) {
    case "fold":
      return true;
    case "check":
      return legal.canCheck;
    case "call":
      return legal.canCall;
    case "bet":
      return legal.canBet && action.amount >= legal.betMin && action.amount <= legal.betMax;
    case "raise":
      return legal.canRaise && action.amount >= legal.raiseMinTotal && action.amount <= legal.raiseMaxTotal;
    case "allin":
      return legal.canAllin && seatStack > 0;
  }
}

function buildPrompt(state: GameState, seatIdx: number, legal: LegalActions): string {
  const seat = state.seats[seatIdx];
  const hole = seat.hole ? `${cardLabel(seat.hole[0])} ${cardLabel(seat.hole[1])}` : "??";
  const board = state.board.length ? state.board.map(cardLabel).join(" ") : "(none)";
  const opponents = state.seats
    .map((s, i) =>
      i === seatIdx
        ? null
        : `  - ${s.displayName}${s.isBot ? " [bot]" : ""}: stack ${s.stack}, status ${s.status}, contributed ${s.contributed} this hand, bet ${s.betThisStreet} this street`,
    )
    .filter(Boolean)
    .join("\n");
  const recentLog = state.log.slice(-8).map((l) => `  [${l.street}] ${l.message}`).join("\n") || "  (none)";

  const choices: string[] = [];
  if (legal.canCheck) choices.push("- check");
  if (legal.canCall) choices.push(`- call (calls ${legal.callAmount})`);
  if (legal.canBet) choices.push(`- bet with amount between ${legal.betMin} and ${legal.betMax} (chips put in this street)`);
  if (legal.canRaise) choices.push(`- raise with amount (total bet this street) between ${legal.raiseMinTotal} and ${legal.raiseMaxTotal}`);
  if (legal.canAllin) choices.push("- allin");
  choices.push("- fold");

  return [
    `You are playing No-Limit Texas Hold'em as "${seat.displayName}". Pick the best action.`,
    "",
    `Street: ${state.street}`,
    `Your hole cards: ${hole}`,
    `Board: ${board}`,
    `Pot: ${state.pot}`,
    `Current bet this street: ${state.currentBet}`,
    `Your bet this street: ${seat.betThisStreet}`,
    `To call: ${state.currentBet - seat.betThisStreet}`,
    `Your stack: ${seat.stack}`,
    `Min raise increment: ${state.minRaise}`,
    `Big blind: ${state.bigBlind}`,
    "",
    "Opponents:",
    opponents || "  (none)",
    "",
    "Recent action:",
    recentLog,
    "",
    "Legal choices (you MUST pick one and respect the amount range):",
    ...choices,
    "",
    "Play with reasonable strategy: fold weak hands facing big bets, value-bet strong hands, mix in occasional bluffs. Amounts must be integers.",
  ].join("\n");
}

export async function aiBotAction(state: GameState, seatIdx: number): Promise<Action> {
  // No key configured → use heuristic immediately (avoids slow timeouts in dev).
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return botAction(state, seatIdx);
  }

  const seat = state.seats[seatIdx];
  if (!seat.hole) return { type: "fold" };

  const legal = legalActions(state, seatIdx);
  const model = process.env.POKER_BOT_MODEL || DEFAULT_MODEL;

  try {
    const { object } = await generateObject({
      model,
      schema: actionSchema,
      prompt: buildPrompt(state, seatIdx, legal),
      abortSignal: AbortSignal.timeout(8000),
    });
    const action = object as Action;
    if (validateAgainstLegal(action, legal, seat.stack)) return action;
    return botAction(state, seatIdx);
  } catch {
    return botAction(state, seatIdx);
  }
}
