import { addPlayer, applyAction, createTable, IllegalActionError, publicView, revealPendingStreet, startHand } from "@/lib/poker/engine";
import { aiBotAction } from "@/lib/poker/bot";
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
import { deleteJSON, loadJSON, saveJSON } from "./persistence";

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
  // Set when the current hand ends, so we can hold the showdown view for
  // a few seconds before rolling over to the next hand.
  endedAt?: number;
};

const HAND_END_PAUSE_MS = 4500;

function runtimeKey(tableId: string): string {
  return `runtime:${tableId}`;
}

async function loadRuntime(tableId: string): Promise<Runtime | null> {
  return loadJSON<Runtime | null>(runtimeKey(tableId), null);
}

// 1 hour TTL — abandoned tables auto-free for re-use. Every action refreshes
// the TTL so active games never expire mid-play.
const RUNTIME_TTL_SECONDS = 3600;

async function commitRuntime(tableId: string, runtime: Runtime): Promise<void> {
  await saveJSON(runtimeKey(tableId), runtime, { ttlSeconds: RUNTIME_TTL_SECONDS });
}

async function deleteRuntime(tableId: string): Promise<void> {
  await deleteJSON(runtimeKey(tableId));
}

function botSeed(tableId: string, idx: number): string {
  return `bot_${tableId}_${idx}_${BOT_NAMES[idx % BOT_NAMES.length]}`;
}

export async function joinTable(args: { tableId: string; userId: string }): Promise<{ runtime: Runtime } | { error: string }> {
  const spec = getTableSpec(args.tableId);
  if (!spec) return { error: "Table not found" };
  const user = await getUser(args.userId);
  if (!user) return { error: "User not found" };

  let runtime = await loadRuntime(args.tableId);
  if (runtime && runtime.userId === args.userId) {
    // Already seated — refresh nothing, return as-is.
    return { runtime };
  }
  if (runtime && runtime.userId !== args.userId) {
    return { error: "Table occupied. Phase 1 supports one human per table." };
  }

  // If the user already has a buy-in committed to this table (e.g. server
  // restarted mid-session), reuse it instead of debiting the bankroll twice.
  const persistedBuyIn = await getTableBuyIn(args.userId, args.tableId);
  let buyIn: number;
  if (persistedBuyIn !== undefined) {
    buyIn = persistedBuyIn;
  } else {
    buyIn = spec.minBuyIn;
    if (user.bankroll < buyIn) {
      return { error: `Need at least ${buyIn} chips to buy in` };
    }
    if (!(await debitBankroll(args.userId, buyIn))) {
      return { error: "Insufficient bankroll" };
    }
    await recordTableBuyIn(args.userId, args.tableId, buyIn);
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
  // Do NOT auto-run bots here. tickTable advances one bot action per poll,
  // so the user sees the betting round play out with visible pacing.
  await commitRuntime(args.tableId, runtime);
  return { runtime };
}

/**
 * Advance the table by ONE step: a single bot action, or roll over to the
 * next hand if the current one ended. Called from the polling GET endpoint
 * so each tick (default 1.2s) shows one event. The user's own turn is a
 * no-op (we wait for their explicit action).
 */
export async function tickTable(args: { tableId: string; userId: string }): Promise<void> {
  const runtime = await loadRuntime(args.tableId);
  if (!runtime || runtime.userId !== args.userId) return;
  const s = runtime.state;

  // 1. If a street deal is queued from the previous tick (the round-closing
  //    action), reveal it now. This is what produces the visible delay
  //    between the closing action and the flop/turn/river cards.
  if (s.pendingDeal) {
    runtime.state = revealPendingStreet(s);
    await commitRuntime(args.tableId, runtime);
    return;
  }

  // 2. Hand over — hold the showdown view for HAND_END_PAUSE_MS so the user
  //    can see the winner banner, then roll into the next one.
  if (s.street === "ended") {
    if (!runtime.endedAt) {
      onHandEnded(runtime);
      runtime.endedAt = Date.now();
      await commitRuntime(args.tableId, runtime);
      return;
    }
    if (Date.now() - runtime.endedAt < HAND_END_PAUSE_MS) {
      return; // still showing the winner
    }
    const userSeat = s.seats[runtime.userSeatIdx];
    const otherWithChips = s.seats.some((seat, i) => i !== runtime.userSeatIdx && seat.stack > 0);
    if (userSeat.stack > 0 && otherWithChips) {
      runtime.state = startHand(s);
      runtime.startOfHandUserStack =
        runtime.state.seats[runtime.userSeatIdx].stack +
        runtime.state.seats[runtime.userSeatIdx].contributed;
      runtime.endedAt = undefined;
      await commitRuntime(args.tableId, runtime);
    }
    return;
  }

  if (s.toActIdx === runtime.userSeatIdx) return; // user's turn — wait
  if (s.toActIdx < 0) return;

  // 3. One bot action per tick — deferDeal so the round-closing action
  //    doesn't bundle the next street's cards into the same response.
  const action = await aiBotAction(s, s.toActIdx);
  try {
    runtime.state = applyAction(s, s.toActIdx, action, { deferDeal: true });
  } catch (e) {
    if (e instanceof IllegalActionError) {
      runtime.state = applyAction(s, s.toActIdx, { type: "fold" }, { deferDeal: true });
    } else {
      throw e;
    }
  }
  await commitRuntime(args.tableId, runtime);
}

function onHandEnded(runtime: Runtime): void {
  const userSeat = runtime.state.seats[runtime.userSeatIdx];
  const endStack = userSeat.stack + userSeat.contributed; // contributed should be 0 after settle but guard anyway
  const delta = endStack - runtime.startOfHandUserStack;
  // Fire-and-forget: ensureLoaded resolves immediately since users.ts was
  // hydrated earlier by getOrCreateSessionUser on this request.
  void recordHandStats(runtime.userId, {
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
  const runtime = await loadRuntime(args.tableId);
  if (!runtime) return { ok: false, error: "Not seated at this table" };
  if (runtime.userId !== args.userId) return { ok: false, error: "Not your seat" };
  if (runtime.state.toActIdx !== runtime.userSeatIdx) {
    return { ok: false, error: "Not your turn" };
  }
  try {
    runtime.state = applyAction(runtime.state, runtime.userSeatIdx, args.action, { deferDeal: true });
  } catch (e) {
    if (e instanceof IllegalActionError) return { ok: false, error: e.message };
    throw e;
  }
  // Do not chain bot actions here; tickTable handles them one per poll
  // so the client can render each move with a visible delay. If this
  // action closed the betting round, pendingDeal is set so the next poll
  // reveals the new community cards on its own tick.
  await commitRuntime(args.tableId, runtime);
  return { ok: true };
}

export async function leaveTable(args: { tableId: string; userId: string }): Promise<void> {
  const runtime = await loadRuntime(args.tableId);
  if (!runtime || runtime.userId !== args.userId) return;
  const userSeat = runtime.state.seats[runtime.userSeatIdx];
  const remaining = userSeat.stack + userSeat.contributed;
  if (remaining > 0) await creditBankroll(args.userId, remaining);
  await clearTableBuyIn(args.userId, args.tableId);
  await deleteRuntime(args.tableId);
}

export async function getPublicState(args: { tableId: string; userId: string }): Promise<GameState | null> {
  const runtime = await loadRuntime(args.tableId);
  if (!runtime || runtime.userId !== args.userId) return null;
  return publicView(runtime.state, runtime.userSeatIdx);
}

export async function getMySeatIdx(args: { tableId: string; userId: string }): Promise<number | null> {
  const runtime = await loadRuntime(args.tableId);
  if (!runtime || runtime.userId !== args.userId) return null;
  return runtime.userSeatIdx;
}
