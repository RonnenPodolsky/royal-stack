import { describe, it, expect } from "vitest";
import { addPlayer, applyAction, createTable, IllegalActionError, startHand } from "./engine";

function setupHU(sb = 5, bb = 10, buyIn = 1000) {
  let s = createTable({ tableId: "t1", smallBlind: sb, bigBlind: bb });
  s = addPlayer(s, { id: "p1", displayName: "Alice", isBot: false, buyIn });
  s = addPlayer(s, { id: "p2", displayName: "Bob", isBot: false, buyIn });
  return s;
}

function setup3() {
  let s = createTable({ tableId: "t1", smallBlind: 5, bigBlind: 10 });
  s = addPlayer(s, { id: "p1", displayName: "Alice", isBot: false, buyIn: 1000 });
  s = addPlayer(s, { id: "p2", displayName: "Bob", isBot: false, buyIn: 1000 });
  s = addPlayer(s, { id: "p3", displayName: "Cara", isBot: false, buyIn: 1000 });
  return s;
}

describe("engine: hand setup", () => {
  it("posts blinds heads-up — dealer is SB", () => {
    let s = setupHU();
    s = startHand(s);
    expect(s.seats[0].betThisStreet).toBe(5); // dealer = SB in HU
    expect(s.seats[1].betThisStreet).toBe(10);
    expect(s.pot).toBe(15);
    expect(s.currentBet).toBe(10);
    expect(s.toActIdx).toBe(0); // SB acts first preflop in HU
  });

  it("posts blinds 3-handed — SB = dealer+1, BB = dealer+2, UTG acts", () => {
    let s = setup3();
    s = startHand(s);
    expect(s.seats[1].betThisStreet).toBe(5);
    expect(s.seats[2].betThisStreet).toBe(10);
    expect(s.pot).toBe(15);
    expect(s.toActIdx).toBe(0); // UTG = dealer+3 = 0
  });

  it("deals 2 hole cards to each active seat", () => {
    let s = setupHU();
    s = startHand(s);
    expect(s.seats[0].hole).not.toBeNull();
    expect(s.seats[1].hole).not.toBeNull();
    expect(s.seats[0].hole?.length).toBe(2);
  });
});

describe("engine: action validation", () => {
  it("rejects action when not your turn", () => {
    let s = setupHU();
    s = startHand(s);
    expect(() => applyAction(s, 1, { type: "fold" })).toThrow(IllegalActionError);
  });

  it("rejects check when facing a bet", () => {
    let s = setupHU();
    s = startHand(s);
    // SB owes 5 to call BB
    expect(() => applyAction(s, 0, { type: "check" })).toThrow(IllegalActionError);
  });

  it("rejects bet that exceeds stack", () => {
    let s = setupHU(5, 10, 50);
    s = startHand(s);
    s = applyAction(s, 0, { type: "call" });
    s = applyAction(s, 1, { type: "check" });
    // flop. BB acts first post-flop in HU (dealer/SB acts last)
    expect(s.toActIdx).toBe(1);
    expect(() => applyAction(s, 1, { type: "bet", amount: 9999 })).toThrow(IllegalActionError);
  });

  it("rejects raise less than min raise (when not all-in)", () => {
    let s = setupHU();
    s = startHand(s);
    // SB to act, currentBet = 10, minRaise = 10 → min raise is to 20
    expect(() => applyAction(s, 0, { type: "raise", amount: 15 })).toThrow(IllegalActionError);
  });

  it("allows raise to exactly min raise", () => {
    let s = setupHU();
    s = startHand(s);
    s = applyAction(s, 0, { type: "raise", amount: 20 });
    expect(s.currentBet).toBe(20);
    expect(s.minRaise).toBe(10);
  });
});

describe("engine: progression", () => {
  it("fold awards pot uncontested", () => {
    let s = setupHU();
    s = startHand(s);
    s = applyAction(s, 0, { type: "fold" });
    expect(s.street).toBe("ended");
    // Bob's net profit = SB (5). Buy-in 1000 + 5 = 1005.
    expect(s.seats[1].stack).toBe(1005);
    expect(s.seats[0].stack).toBe(995);
    expect(s.lastShowdown?.winners[0].seatIdx).toBe(1);
  });

  it("call + check progresses preflop → flop", () => {
    let s = setupHU();
    s = startHand(s);
    s = applyAction(s, 0, { type: "call" }); // SB calls 5 more
    s = applyAction(s, 1, { type: "check" }); // BB checks
    expect(s.street).toBe("flop");
    expect(s.board.length).toBe(3);
    expect(s.currentBet).toBe(0);
  });

  it("full hand: heads-up checks down to showdown", () => {
    let s = setupHU();
    s = startHand(s);
    s = applyAction(s, 0, { type: "call" });
    s = applyAction(s, 1, { type: "check" }); // → flop
    s = applyAction(s, 1, { type: "check" }); // BB acts first post-flop in HU
    s = applyAction(s, 0, { type: "check" }); // → turn
    s = applyAction(s, 1, { type: "check" });
    s = applyAction(s, 0, { type: "check" }); // → river
    s = applyAction(s, 1, { type: "check" });
    s = applyAction(s, 0, { type: "check" }); // → showdown
    expect(s.street).toBe("ended");
    expect(s.lastShowdown).not.toBeNull();
    expect(s.board.length).toBe(5);
  });
});

describe("engine: side pots", () => {
  it("short stack all-in creates side pot", () => {
    // 3 players, p3 has 100, others have 1000. p3 jams, both call.
    let s = createTable({ tableId: "t", smallBlind: 5, bigBlind: 10 });
    s = addPlayer(s, { id: "p1", displayName: "A", isBot: false, buyIn: 1000 });
    s = addPlayer(s, { id: "p2", displayName: "B", isBot: false, buyIn: 1000 });
    s = addPlayer(s, { id: "p3", displayName: "C", isBot: false, buyIn: 100 });
    s = startHand(s);
    // dealerIdx is initially 0 (default). After startHand it moves to next eligible (still 0).
    // So 3-handed with dealer=0: SB=1, BB=2, UTG=0 acts first.
    // p3 = idx 2 = BB with 100 chip. p1 = UTG.
    // UTG raises to 200 (allin would be capped — they have 1000). p1 raises 200.
    s = applyAction(s, 0, { type: "raise", amount: 200 });
    s = applyAction(s, 1, { type: "call" }); // SB calls 200
    // p3 (BB) only has 90 left after posting 10. Goes allin.
    s = applyAction(s, 2, { type: "allin" });
    // Action returns to p1 — still owes nothing, hasActedThisStreet=true. p2 also matched.
    // Hand should run out automatically since p3 is all-in and p1/p2 are matched.
    // Verify pot accounting: total pot should be 200+200+100 = 500
    expect(s.pot).toBe(500);
  });
});
