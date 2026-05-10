import { randomBytes } from "node:crypto";
import { loadJSON, scheduleSave } from "./persistence";

export type UserRecord = {
  id: string;
  displayName: string;
  bankroll: number;
  handsPlayed: number;
  biggestPot: number;
  netProfit: number;
  lastClaimAt: number | null;
  createdAt: number;
  // Tracks chips currently committed to live tables. Survives restart so that
  // re-joining a table after a server bounce does not re-debit the buy-in.
  activeBuyIns?: Record<string, number>;
};

const STARTING_BANKROLL = 10_000;
const USERS_FILE = "users.json";

const users = new Map<string, UserRecord>();
let loadPromise: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const initial = await loadJSON<Record<string, UserRecord>>(USERS_FILE, {});
      for (const [k, v] of Object.entries(initial)) users.set(k, v);
    })();
  }
  return loadPromise;
}

function persist(): void {
  scheduleSave(USERS_FILE, () => Object.fromEntries(users.entries()));
}

export async function getOrCreateUser(id: string | null): Promise<UserRecord> {
  await ensureLoaded();
  if (id && users.has(id)) return users.get(id)!;
  const newId = id ?? randomBytes(12).toString("hex");
  const user: UserRecord = {
    id: newId,
    displayName: `Player_${newId.slice(0, 4)}`,
    bankroll: STARTING_BANKROLL,
    handsPlayed: 0,
    biggestPot: 0,
    netProfit: 0,
    lastClaimAt: null,
    createdAt: Date.now(),
  };
  users.set(newId, user);
  persist();
  return user;
}

export async function getUser(id: string): Promise<UserRecord | undefined> {
  await ensureLoaded();
  return users.get(id);
}

export async function debitBankroll(id: string, amount: number): Promise<boolean> {
  await ensureLoaded();
  const u = users.get(id);
  if (!u || u.bankroll < amount) return false;
  u.bankroll -= amount;
  persist();
  return true;
}

export async function creditBankroll(id: string, amount: number): Promise<void> {
  await ensureLoaded();
  const u = users.get(id);
  if (!u) return;
  u.bankroll += amount;
  persist();
}

export async function recordHandStats(
  id: string,
  args: { potParticipated: number; netDelta: number },
): Promise<void> {
  await ensureLoaded();
  const u = users.get(id);
  if (!u) return;
  u.handsPlayed += 1;
  u.netProfit += args.netDelta;
  if (args.potParticipated > u.biggestPot) u.biggestPot = args.potParticipated;
  persist();
}

export async function getTableBuyIn(userId: string, tableId: string): Promise<number | undefined> {
  await ensureLoaded();
  return users.get(userId)?.activeBuyIns?.[tableId];
}

export async function recordTableBuyIn(userId: string, tableId: string, amount: number): Promise<void> {
  await ensureLoaded();
  const u = users.get(userId);
  if (!u) return;
  if (!u.activeBuyIns) u.activeBuyIns = {};
  u.activeBuyIns[tableId] = amount;
  persist();
}

export async function clearTableBuyIn(userId: string, tableId: string): Promise<void> {
  await ensureLoaded();
  const u = users.get(userId);
  if (!u || !u.activeBuyIns) return;
  delete u.activeBuyIns[tableId];
  persist();
}

export async function claimDailyChips(id: string, amount: number): Promise<{ success: boolean; nextClaimAt?: number }> {
  await ensureLoaded();
  const u = users.get(id);
  if (!u) return { success: false };
  const now = Date.now();
  const cooldown = 1000 * 60 * 60 * 24;
  if (u.lastClaimAt && now - u.lastClaimAt < cooldown) {
    return { success: false, nextClaimAt: u.lastClaimAt + cooldown };
  }
  u.bankroll += amount;
  u.lastClaimAt = now;
  persist();
  return { success: true };
}
