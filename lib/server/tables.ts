import { addPlayer, applyAction, createTable, IllegalActionError, publicView, startHand } from "@/lib/poker/engine";
import { botAction } from "@/lib/poker/bot";
import { getTable as getTableSpec } from "@/lib/tables";
import type { Action, GameState } from "@/lib/poker/types";
import {
  clearTableBuyIn,
  creditBankroll,
  debitBankroll,
  getTableBuyIn,
  getUser,
  recordHandStats,
  recordTableBuyIn,
} from "./users";

const BOT_NAMES = [
  "Dr. Kraken",
  "Queen_B",
  "Shark_01",
  "Phantom",
  "Velvet",
  "IronBluff",
  "Maverick",
  "Whisper",
];

type Runtime = {
  state: GameState;
  userId: string;
  userSeatIdx: number;
  startOfHandUserStack: number;
  buyIn: number;
};

const runtimes = new Map<string, Runtime>();
const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  locks.set(key, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (locks.get(key) === next) locks.delete(key);
  }
}

function botSeed(tableId: string, idx: number): string {
  return `bot_${tableId}_${idx}_${BOT_NAMES[idx % BOT_NAMES.length]}`;
}

export async function joinTable(args: { tableId: string; userId: string }): Promise<{ runtime: Runtime } | { error: string }> {
  const spec = getTableSpec(args.tableId);
  if (!spec) return { error: "Table not found" };
  const user = getUser(args.userId);
  if (!user) return { error: "User not found" };

  return withLock(args.tableId, () => {
    let runtime = runtimes.get(args.tableId);
    if (runtime && runtime.userId === args.userId) {
      // Already seated
      return { runtime };
    }
    if (runtime && runtime.userId !== args.userId) {
      return { error: "Table occupied. Phase 1 supports one human per table." };
    }
    // If the user already has a buy-in committed to this table (e.g. server
    // restarted mid-session), reuse it instead of debiting the bankroll twice.
    const persistedBuyIn = getTableBuyIn(args.userId, args.tableId);
    let buyIn: number;
    if (persistedBuyIn !== undefined) {
      buyIn = persistedBuyIn;
    } else {
      buyIn = spec.minBuyIn;
      if (user.bankroll < buyIn) {
        return { error: `Need at least ${buyIn} chips to buy in` };
      }
      if (!debitBankroll(args.userId, buyIn)) {
        return { error: "Insufficient bankroll" };
      }
      recordTableBuyIn(args.userId, args.tableId, buyIn);
    }

    let s = createTable({ tableId: spec.id, smallBlind: spec.smallBlind, bigBlind: spec.bigBlind });
    s = addPlayer(s, { id: args.userId, displayName: user.displayName, isBot: false, buyIn });
    const userSeatIdx = s.seats.length - 1;
    for (let i = 0; i < spec.seats - 1; i++) {
      s = addPlayer(s, {
        id: botSeed(spec.id, i),
        displayName: BOT_NAMES[i % BOT_NAMES.length],
        isBot: true,
        buyIn,
      });
    }
    s = startHand(s);
    const userSeat = s.seats[userSeatIdx];
    runtime = {
      state: s,
      userId: args.userId,
      userSeatIdx,
      startOfHandUserStack: userSeat.stack + userSeat.contributed,
      buyIn,
    };
    runtimes.set(args.tableId, runtime);
    runAutoTurns(runtime);
    return { runtime };
  });
}

function runAutoTurns(runtime: Runtime): void {
  // Run bot actions while it's a bot's turn and the hand is in progress.
  // Bound iterations to avoid runaway loops.
  let iterations = 0;
  while (iterations++ < 200) {
    const s = runtime.state;
    if (s.street === "ended") {
      onHandEnded(runtime);
      // Auto-start next hand if user still has chips and at least one bot has chips
      const userSeat = s.seats[runtime.userSeatIdx];
      const otherWithChips = s.seats.some((seat, i) => i !== runtime.userSeatIdx && seat.stack > 0);
      if (userSeat.stack > 0 && otherWithChips) {
        runtime.state = startHand(s);
        runtime.startOfHandUserStack =
          runtime.state.seats[runtime.userSeatIdx].stack +
          runtime.state.seats[runtime.userSeatIdx].contributed;
        continue;
      }
      return;
    }
    if (s.toActIdx === runtime.userSeatIdx) return; // wait for user
    if (s.toActIdx < 0) return;
    const action = botAction(s, s.toActIdx);
    try {
      runtime.state = applyAction(s, s.toActIdx, action);
    } catch (e) {
      if (e instanceof IllegalActionError) {
        // Bot picked illegal action — fold as fallback so the hand can progress.
        runtime.state = applyAction(s, s.toActIdx, { type: "fold" });
      } else {
        throw e;
      }
    }
  }
}

function onHandEnded(runtime: Runtime): void {
  const userSeat = runtime.state.seats[runtime.userSeatIdx];
  const endStack = userSeat.stack + userSeat.contributed; // contributed should be 0 after settle but guard anyway
  const delta = endStack - runtime.startOfHandUserStack;
  recordHandStats(runtime.userId, {
    potParticipated: runtime.state.pot + (runtime.state.lastShowdown?.winners.reduce((s, w) => s + w.amount, 0) ?? 0),
    netDelta: delta,
  });
}

export type ActResult =
  | { ok: true }
  | { ok: false; error: string };

export async function actAtTable(args: {
  tableId: string;
  userId: string;
  action: Action;
}): Promise<ActResult> {
  return withLock(args.tableId, () => {
    const runtime = runtimes.get(args.tableId);
    if (!runtime) return { ok: false, error: "Not seated at this table" };
    if (runtime.userId !== args.userId) return { ok: false, error: "Not your seat" };
    if (runtime.state.toActIdx !== runtime.userSeatIdx) {
      return { ok: false, error: "Not your turn" };
    }
    try {
      runtime.state = applyAction(runtime.state, runtime.userSeatIdx, args.action);
    } catch (e) {
      if (e instanceof IllegalActionError) return { ok: false, error: e.message };
      throw e;
    }
    runAutoTurns(runtime);
    return { ok: true };
  });
}

export async function leaveTable(args: { tableId: string; userId: string }): Promise<void> {
  await withLock(args.tableId, () => {
    const runtime = runtimes.get(args.tableId);
    if (!runtime || runtime.userId !== args.userId) return;
    const userSeat = runtime.state.seats[runtime.userSeatIdx];
    const remaining = userSeat.stack + userSeat.contributed;
    if (remaining > 0) creditBankroll(args.userId, remaining);
    clearTableBuyIn(args.userId, args.tableId);
    runtimes.delete(args.tableId);
  });
}

export function getPublicState(args: { tableId: string; userId: string }): GameState | null {
  const runtime = runtimes.get(args.tableId);
  if (!runtime || runtime.userId !== args.userId) return null;
  return publicView(runtime.state, runtime.userSeatIdx);
}

export function getMySeatIdx(args: { tableId: string; userId: string }): number | null {
  const runtime = runtimes.get(args.tableId);
  if (!runtime || runtime.userId !== args.userId) return null;
  return runtime.userSeatIdx;
}
