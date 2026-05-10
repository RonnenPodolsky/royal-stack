import { shuffledDeck, cardToString } from "./deck";
import { bestOfSeven, compareHands, categoryName } from "./evaluator";
import type {
  Action,
  Card,
  GameState,
  HandRank,
  LogEntry,
  Seat,
  SeatStatus,
  ShowdownResult,
  Street,
} from "./types";

export type CreateTableArgs = {
  tableId: string;
  smallBlind: number;
  bigBlind: number;
};

export function createTable(args: CreateTableArgs): GameState {
  return {
    tableId: args.tableId,
    smallBlind: args.smallBlind,
    bigBlind: args.bigBlind,
    seats: [],
    dealerIdx: -1,
    street: "ended",
    deck: [],
    board: [],
    pot: 0,
    currentBet: 0,
    minRaise: args.bigBlind,
    toActIdx: -1,
    lastAggressorIdx: null,
    handNumber: 0,
    log: [],
    lastShowdown: null,
  };
}

export function addPlayer(
  state: GameState,
  args: { id: string; displayName: string; isBot: boolean; buyIn: number },
): GameState {
  if (state.seats.find((s) => s.id === args.id)) {
    throw new Error("Player already at table");
  }
  if (args.buyIn <= 0) throw new Error("Buy-in must be positive");
  const seat: Seat = {
    id: args.id,
    displayName: args.displayName,
    isBot: args.isBot,
    stack: args.buyIn,
    hole: null,
    status: "sittingout",
    contributed: 0,
    betThisStreet: 0,
    hasActedThisStreet: false,
  };
  return { ...state, seats: [...state.seats, seat] };
}

function log(state: GameState, message: string): void {
  const entry: LogEntry = {
    handNumber: state.handNumber,
    street: state.street,
    message,
    ts: Date.now(),
  };
  state.log.push(entry);
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}

function nextActiveSeat(state: GameState, fromIdx: number): number {
  const n = state.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIdx + i) % n;
    const s = state.seats[idx];
    if (s.status === "active") return idx;
  }
  return -1;
}

function nextEligibleForBlind(state: GameState, fromIdx: number): number {
  const n = state.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIdx + i) % n;
    const s = state.seats[idx];
    if (s.stack > 0) return idx;
  }
  return -1;
}

function postBlind(state: GameState, seatIdx: number, amount: number): void {
  const seat = state.seats[seatIdx];
  const post = Math.min(seat.stack, amount);
  seat.stack -= post;
  seat.contributed += post;
  seat.betThisStreet += post;
  state.pot += post;
  if (seat.stack === 0) seat.status = "allin";
}

export function startHand(state: GameState): GameState {
  const eligible = state.seats.filter((s) => s.stack > 0);
  if (eligible.length < 2) throw new Error("Need at least 2 players with chips");

  const next: GameState = {
    ...state,
    deck: shuffledDeck(),
    board: [],
    pot: 0,
    currentBet: 0,
    minRaise: state.bigBlind,
    street: "preflop",
    handNumber: state.handNumber + 1,
    lastAggressorIdx: null,
    log: state.log.slice(),
    lastShowdown: null,
    seats: state.seats.map((s) => ({
      ...s,
      hole: null,
      status: (s.stack > 0 ? "active" : "sittingout") as SeatStatus,
      contributed: 0,
      betThisStreet: 0,
      hasActedThisStreet: false,
    })),
  };

  // Move dealer button to next eligible
  next.dealerIdx = nextEligibleForBlind(next, state.dealerIdx);

  const activeCount = next.seats.filter((s) => s.status === "active").length;

  let sbIdx: number;
  let bbIdx: number;
  if (activeCount === 2) {
    // Heads-up: dealer is SB
    sbIdx = next.dealerIdx;
    bbIdx = nextActiveSeat(next, sbIdx);
  } else {
    sbIdx = nextActiveSeat(next, next.dealerIdx);
    bbIdx = nextActiveSeat(next, sbIdx);
  }

  postBlind(next, sbIdx, state.smallBlind);
  postBlind(next, bbIdx, state.bigBlind);
  log(next, `${next.seats[sbIdx].displayName} posts SB ($${state.smallBlind})`);
  log(next, `${next.seats[bbIdx].displayName} posts BB ($${state.bigBlind})`);

  next.currentBet = state.bigBlind;
  next.minRaise = state.bigBlind;

  // Deal hole cards
  for (const seat of next.seats) {
    if (seat.status === "active" || seat.status === "allin") {
      const c1 = next.deck.pop();
      const c2 = next.deck.pop();
      if (!c1 || !c2) throw new Error("deck underflow");
      seat.hole = [c1, c2];
    }
  }

  // First to act preflop: seat after BB (UTG). In heads-up, that's the dealer/SB.
  if (activeCount === 2) {
    next.toActIdx = sbIdx;
  } else {
    next.toActIdx = nextActiveSeat(next, bbIdx);
  }
  next.lastAggressorIdx = bbIdx; // BB is the "last aggressor" preflop

  return next;
}

function bettingRoundComplete(state: GameState): boolean {
  const live = state.seats.filter((s) => s.status === "active" || s.status === "allin");
  if (live.length <= 1) return true;
  const stillActive = state.seats.filter((s) => s.status === "active");
  if (stillActive.length === 0) return true;
  // Every active seat must have acted and matched currentBet
  for (const s of stillActive) {
    if (!s.hasActedThisStreet) return false;
    if (s.betThisStreet !== state.currentBet) return false;
  }
  return true;
}

function dealStreet(state: GameState): void {
  // Burn one
  state.deck.pop();
  if (state.street === "flop") {
    const c1 = state.deck.pop();
    const c2 = state.deck.pop();
    const c3 = state.deck.pop();
    if (!c1 || !c2 || !c3) throw new Error("deck underflow");
    state.board.push(c1, c2, c3);
  } else {
    const c = state.deck.pop();
    if (!c) throw new Error("deck underflow");
    state.board.push(c);
  }
}

function buildPots(seats: Seat[]): Array<{ amount: number; eligible: number[] }> {
  const liveLevels = seats
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.status !== "folded" && s.contributed > 0)
    .map(({ s }) => s.contributed);
  const levels = Array.from(new Set(liveLevels)).sort((a, b) => a - b);
  const pots: Array<{ amount: number; eligible: number[] }> = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const s of seats) {
      amount += Math.max(0, Math.min(s.contributed, level) - prev);
    }
    const eligible: number[] = [];
    seats.forEach((s, idx) => {
      if (s.status !== "folded" && s.contributed >= level) eligible.push(idx);
    });
    pots.push({ amount, eligible });
    prev = level;
  }
  return pots;
}

function settleShowdown(state: GameState): void {
  const result: ShowdownResult = { winners: [] };
  const live = state.seats
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s.status !== "folded");

  if (live.length === 1) {
    // Uncontested
    const winner = live[0];
    const total = state.seats.reduce((sum, s) => sum + s.contributed, 0);
    winner.s.stack += total;
    result.winners.push({ seatIdx: winner.idx, amount: total });
    log(state, `${winner.s.displayName} wins $${total}`);
    state.lastShowdown = result;
    state.pot = 0;
    return;
  }

  // Evaluate hands for live seats
  const hands = new Map<number, HandRank>();
  for (const { s, idx } of live) {
    if (!s.hole) continue;
    const seven: Card[] = [...s.hole, ...state.board];
    hands.set(idx, bestOfSeven(seven));
  }

  const pots = buildPots(state.seats);
  for (const pot of pots) {
    const eligibleHands = pot.eligible
      .map((idx) => ({ idx, hand: hands.get(idx) }))
      .filter((x): x is { idx: number; hand: HandRank } => x.hand !== undefined);
    if (eligibleHands.length === 0) continue;
    eligibleHands.sort((a, b) => compareHands(b.hand, a.hand));
    const top = eligibleHands[0].hand;
    const winners = eligibleHands.filter((h) => compareHands(h.hand, top) === 0);
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const w of winners) {
      const seat = state.seats[w.idx];
      const got = share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      seat.stack += got;
      result.winners.push({ seatIdx: w.idx, amount: got, bestHand: w.hand });
      log(
        state,
        `${seat.displayName} wins $${got} with ${categoryName(w.hand.category)}`,
      );
    }
  }
  state.lastShowdown = result;
  state.pot = 0;
}

function advanceAfterAction(state: GameState): void {
  const stillActive = state.seats.filter((s) => s.status === "active");
  const liveCount = state.seats.filter(
    (s) => s.status === "active" || s.status === "allin",
  ).length;

  // If only one player remains (others folded), award pot
  if (liveCount === 1 || stillActive.length === 0) {
    state.street = "showdown";
    settleShowdown(state);
    state.street = "ended";
    state.toActIdx = -1;
    return;
  }

  if (!bettingRoundComplete(state)) {
    // Move to next active seat
    state.toActIdx = nextActiveSeat(state, state.toActIdx);
    return;
  }

  // Round done. Reset for next street.
  for (const s of state.seats) {
    s.betThisStreet = 0;
    s.hasActedThisStreet = false;
  }
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.lastAggressorIdx = null;

  const nextStreet: Record<Street, Street> = {
    preflop: "flop",
    flop: "turn",
    turn: "river",
    river: "showdown",
    showdown: "ended",
    ended: "ended",
  };
  state.street = nextStreet[state.street];

  if (state.street === "showdown" || state.street === "ended") {
    settleShowdown(state);
    state.street = "ended";
    state.toActIdx = -1;
    return;
  }

  dealStreet(state);
  log(state, `Dealing ${state.street}: ${state.board.map(cardToString).join(", ")}`);

  // If only one active player but multiple all-ins, no betting — auto-advance
  if (stillActive.length <= 1) {
    advanceAfterAction(state);
    return;
  }

  // First to act post-flop: first active seat clockwise from dealer
  state.toActIdx = nextActiveSeat(state, state.dealerIdx);
}

export class IllegalActionError extends Error {}

function validateAction(state: GameState, seatIdx: number, action: Action): void {
  if (state.street === "ended" || state.street === "showdown") {
    throw new IllegalActionError("Hand is not in progress");
  }
  if (state.toActIdx !== seatIdx) {
    throw new IllegalActionError("Not your turn");
  }
  const seat = state.seats[seatIdx];
  if (seat.status !== "active") {
    throw new IllegalActionError("Seat is not active");
  }

  const toCall = state.currentBet - seat.betThisStreet;

  switch (action.type) {
    case "fold":
      return;
    case "check":
      if (toCall > 0) throw new IllegalActionError("Cannot check, must call or fold");
      return;
    case "call":
      if (toCall <= 0) throw new IllegalActionError("Nothing to call");
      return;
    case "bet": {
      if (state.currentBet > 0) {
        throw new IllegalActionError("Cannot bet, must raise");
      }
      if (!Number.isFinite(action.amount) || action.amount <= 0) {
        throw new IllegalActionError("Bet amount must be positive");
      }
      if (action.amount > seat.stack) {
        throw new IllegalActionError("Bet exceeds stack");
      }
      if (action.amount < state.bigBlind && action.amount !== seat.stack) {
        throw new IllegalActionError(`Min bet is $${state.bigBlind}`);
      }
      return;
    }
    case "raise": {
      if (state.currentBet === 0) {
        throw new IllegalActionError("Cannot raise, must bet");
      }
      if (!Number.isFinite(action.amount) || action.amount <= 0) {
        throw new IllegalActionError("Raise amount must be positive");
      }
      // amount = the new total bet level
      const newTotal = action.amount;
      const minNewTotal = state.currentBet + state.minRaise;
      if (newTotal < minNewTotal && newTotal - seat.betThisStreet !== seat.stack) {
        throw new IllegalActionError(`Min raise to $${minNewTotal}`);
      }
      const cost = newTotal - seat.betThisStreet;
      if (cost > seat.stack) {
        throw new IllegalActionError("Raise exceeds stack");
      }
      return;
    }
    case "allin":
      if (seat.stack <= 0) throw new IllegalActionError("No chips left");
      return;
  }
}

export function applyAction(state: GameState, seatIdx: number, action: Action): GameState {
  const next: GameState = {
    ...state,
    seats: state.seats.map((s) => ({ ...s })),
    deck: state.deck.slice(),
    board: state.board.slice(),
    log: state.log.slice(),
  };

  validateAction(next, seatIdx, action);
  const seat = next.seats[seatIdx];
  const toCall = next.currentBet - seat.betThisStreet;

  switch (action.type) {
    case "fold": {
      seat.status = "folded";
      seat.hasActedThisStreet = true;
      log(next, `${seat.displayName} folds`);
      break;
    }
    case "check": {
      seat.hasActedThisStreet = true;
      log(next, `${seat.displayName} checks`);
      break;
    }
    case "call": {
      const pay = Math.min(seat.stack, toCall);
      seat.stack -= pay;
      seat.contributed += pay;
      seat.betThisStreet += pay;
      next.pot += pay;
      seat.hasActedThisStreet = true;
      if (seat.stack === 0) seat.status = "allin";
      log(next, `${seat.displayName} calls $${pay}`);
      break;
    }
    case "bet": {
      const amount = action.amount;
      seat.stack -= amount;
      seat.contributed += amount;
      seat.betThisStreet += amount;
      next.pot += amount;
      next.currentBet = seat.betThisStreet;
      next.minRaise = amount;
      next.lastAggressorIdx = seatIdx;
      seat.hasActedThisStreet = true;
      // Reopen action for everyone else
      for (const s of next.seats) {
        if (s !== seat && s.status === "active") s.hasActedThisStreet = false;
      }
      if (seat.stack === 0) seat.status = "allin";
      log(next, `${seat.displayName} bets $${amount}`);
      break;
    }
    case "raise": {
      const newTotal = action.amount;
      const cost = newTotal - seat.betThisStreet;
      const raiseSize = newTotal - next.currentBet;
      seat.stack -= cost;
      seat.contributed += cost;
      seat.betThisStreet = newTotal;
      next.pot += cost;
      const isAllIn = seat.stack === 0;
      const isFullRaise = raiseSize >= next.minRaise;
      next.currentBet = newTotal;
      if (isFullRaise) {
        next.minRaise = raiseSize;
        next.lastAggressorIdx = seatIdx;
        for (const s of next.seats) {
          if (s !== seat && s.status === "active") s.hasActedThisStreet = false;
        }
      }
      seat.hasActedThisStreet = true;
      if (isAllIn) seat.status = "allin";
      log(next, `${seat.displayName} raises to $${newTotal}`);
      break;
    }
    case "allin": {
      const allInAmount = seat.stack;
      const newTotal = seat.betThisStreet + allInAmount;
      const wasFacingBet = next.currentBet > seat.betThisStreet;
      const raiseSize = newTotal - next.currentBet;
      seat.stack = 0;
      seat.contributed += allInAmount;
      seat.betThisStreet = newTotal;
      next.pot += allInAmount;
      seat.status = "allin";
      seat.hasActedThisStreet = true;
      if (newTotal > next.currentBet) {
        const isFullRaise = !wasFacingBet || raiseSize >= next.minRaise;
        next.currentBet = newTotal;
        if (isFullRaise) {
          next.minRaise = Math.max(raiseSize, state.bigBlind);
          next.lastAggressorIdx = seatIdx;
          for (const s of next.seats) {
            if (s !== seat && s.status === "active") s.hasActedThisStreet = false;
          }
        }
      }
      log(next, `${seat.displayName} all-in for $${allInAmount}`);
      break;
    }
  }

  advanceAfterAction(next);
  return next;
}

export function publicView(state: GameState, viewerSeatIdx: number | null): GameState {
  // Hide hole cards of other seats. Reveal at showdown for non-folded.
  const isShowdown = state.street === "ended" && state.lastShowdown !== null;
  return {
    ...state,
    deck: [], // never expose remaining deck
    seats: state.seats.map((s, idx) => ({
      ...s,
      hole:
        idx === viewerSeatIdx || (isShowdown && s.status !== "folded") ? s.hole : null,
    })),
  };
}
