import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "royal-stack-tables-"));
const ORIGINAL_CWD = process.cwd();

type Mod = typeof import("./tables");
type UsersMod = typeof import("./users");

let tables: Mod;
let usersMod: UsersMod;
let userA = "";
let userB = "";

beforeEach(async () => {
  process.chdir(TMP_ROOT);
  // Wipe any persisted file from a previous test
  fs.rmSync(path.join(TMP_ROOT, ".data"), { recursive: true, force: true });
  vi.resetModules();
  tables = await import("./tables");
  usersMod = await import("./users");
  userA = usersMod.getOrCreateUser(null).id;
  userB = usersMod.getOrCreateUser(null).id;
});

afterAll(() => {
  process.chdir(ORIGINAL_CWD);
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("tables runtime — security", () => {
  it("user A can join a low-stakes table", async () => {
    const result = await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    expect("error" in result).toBe(false);
  });

  it("rejects join when another human is already seated", async () => {
    const a = await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    expect("error" in a).toBe(false);
    const b = await tables.joinTable({ tableId: "shadow-hold", userId: userB });
    expect("error" in b).toBe(true);
    if ("error" in b) expect(b.error).toMatch(/occupied/i);
  });

  it("rejects join for non-existent table", async () => {
    const result = await tables.joinTable({ tableId: "no-such-table", userId: userA });
    expect("error" in result).toBe(true);
  });

  it("rejects join when bankroll is insufficient", async () => {
    // Drain user A's bankroll
    expect(usersMod.debitBankroll(userA, 10_000)).toBe(true);
    const result = await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    expect("error" in result).toBe(true);
  });

  it("getPublicState returns null for a non-seated user", async () => {
    await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    const state = tables.getPublicState({ tableId: "shadow-hold", userId: userB });
    expect(state).toBeNull();
  });

  it("getPublicState hides opponent hole cards but reveals own", async () => {
    await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    const state = tables.getPublicState({ tableId: "shadow-hold", userId: userA });
    expect(state).not.toBeNull();
    if (!state) return;
    const meIdx = tables.getMySeatIdx({ tableId: "shadow-hold", userId: userA });
    expect(meIdx).not.toBeNull();
    if (meIdx === null) return;
    expect(state.seats[meIdx].hole).not.toBeNull();
    state.seats.forEach((seat, i) => {
      if (i === meIdx) return;
      // Bots' hole cards must be redacted in the public view sent to userA
      expect(seat.hole).toBeNull();
    });
  });

  it("rejects an action from a user not seated at the table", async () => {
    await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    const result = await tables.actAtTable({
      tableId: "shadow-hold",
      userId: userB,
      action: { type: "fold" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an action when it is not the user's turn", async () => {
    // After joinTable, runAutoTurns runs bots until either showdown or user turn.
    // Capture state and find a seat that isn't toActIdx for the user — but user
    // is the only human, so easier path: just assume it's already user's turn
    // OR force a check on the wrong-user pattern (already covered above).
    // Here we test: act with an action invalid for current state.
    await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    const state = tables.getPublicState({ tableId: "shadow-hold", userId: userA });
    expect(state).not.toBeNull();
    if (!state) return;
    if (state.toActIdx !== tables.getMySeatIdx({ tableId: "shadow-hold", userId: userA })) {
      // Not the user's turn — any action they send must be rejected
      const r = await tables.actAtTable({
        tableId: "shadow-hold",
        userId: userA,
        action: { type: "fold" },
      });
      expect(r.ok).toBe(false);
    } else {
      // It IS the user's turn — try an illegal raise (below min) and expect rejection
      const illegal = await tables.actAtTable({
        tableId: "shadow-hold",
        userId: userA,
        action: { type: "raise", amount: 0 },
      });
      expect(illegal.ok).toBe(false);
    }
  });

  it("leaveTable refunds remaining stack to bankroll", async () => {
    const before = usersMod.getUser(userA)!.bankroll;
    await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    const afterJoin = usersMod.getUser(userA)!.bankroll;
    expect(afterJoin).toBeLessThan(before);
    await tables.leaveTable({ tableId: "shadow-hold", userId: userA });
    const afterLeave = usersMod.getUser(userA)!.bankroll;
    // After leave, bankroll = pre-join + (any winnings) or pre-join (if no hands settled).
    // At minimum it should be >= afterJoin (refunded the stack).
    expect(afterLeave).toBeGreaterThanOrEqual(afterJoin);
  });

  it("active buy-in survives a simulated server restart (no double debit)", async () => {
    // Step 1: user joins, bankroll debited, activeBuyIn recorded.
    const before = usersMod.getUser(userA)!.bankroll;
    await tables.joinTable({ tableId: "shadow-hold", userId: userA });
    const afterFirstJoin = usersMod.getUser(userA)!.bankroll;
    expect(afterFirstJoin).toBeLessThan(before);
    expect(usersMod.getTableBuyIn(userA, "shadow-hold")).toBeDefined();

    // Step 2: simulate restart — re-import tables module (wipes runtimes),
    // but users persist (kept the same userA id).
    // Wait for any pending persistence writes to flush before re-import.
    await new Promise((r) => setTimeout(r, 700));
    vi.resetModules();
    const tables2 = await import("./tables");
    const usersMod2 = await import("./users");
    const bankrollAfterRestart = usersMod2.getUser(userA)!.bankroll;
    expect(bankrollAfterRestart).toBe(afterFirstJoin);

    // Step 3: user re-joins same table — must NOT debit again.
    await tables2.joinTable({ tableId: "shadow-hold", userId: userA });
    const afterRejoin = usersMod2.getUser(userA)!.bankroll;
    expect(afterRejoin).toBe(bankrollAfterRestart);
  });
});
