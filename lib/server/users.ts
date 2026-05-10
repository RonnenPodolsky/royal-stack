import { randomBytes } from "node:crypto";
import { loadJSON, saveJSON } from "./persistence";

export type UserRecord = {
  id: string;
  displayName: string;
  bankroll: number;
  handsPlayed: number;
  biggestPot: number;
  netProfit: number;
  lastClaimAt: number | null;
  createdAt: number;
  activeBuyIns?: Record<string, number>;
  avatarUrl?: string;
  email?: string;
};

const STARTING_BANKROLL = 10_000;

function userKey(id: string): string {
  return `user:${id}`;
}

async function loadUser(id: string): Promise<UserRecord | null> {
  return loadJSON<UserRecord | null>(userKey(id), null);
}

async function saveUser(record: UserRecord): Promise<void> {
  await saveJSON(userKey(record.id), record);
}

export async function getUser(id: string): Promise<UserRecord | undefined> {
  return (await loadUser(id)) ?? undefined;
}

export async function getOrCreateUser(id: string | null): Promise<UserRecord> {
  if (id) {
    const existing = await loadUser(id);
    if (existing) return existing;
  }
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
  await saveUser(user);
  return user;
}

export async function debitBankroll(id: string, amount: number): Promise<boolean> {
  const u = await loadUser(id);
  if (!u || u.bankroll < amount) return false;
  u.bankroll -= amount;
  await saveUser(u);
  return true;
}

export async function creditBankroll(id: string, amount: number): Promise<void> {
  const u = await loadUser(id);
  if (!u) return;
  u.bankroll += amount;
  await saveUser(u);
}

export async function recordHandStats(
  id: string,
  args: { potParticipated: number; netDelta: number },
): Promise<void> {
  const u = await loadUser(id);
  if (!u) return;
  u.handsPlayed += 1;
  u.netProfit += args.netDelta;
  if (args.potParticipated > u.biggestPot) u.biggestPot = args.potParticipated;
  await saveUser(u);
}

export async function updateUserProfile(
  id: string,
  updates: { displayName?: string; avatarUrl?: string; email?: string },
): Promise<void> {
  const u = await loadUser(id);
  if (!u) return;
  let changed = false;
  if (updates.displayName && updates.displayName !== u.displayName) {
    u.displayName = updates.displayName;
    changed = true;
  }
  if (updates.avatarUrl && updates.avatarUrl !== u.avatarUrl) {
    u.avatarUrl = updates.avatarUrl;
    changed = true;
  }
  if (updates.email && updates.email !== u.email) {
    u.email = updates.email;
    changed = true;
  }
  if (changed) await saveUser(u);
}

export async function getTableBuyIn(userId: string, tableId: string): Promise<number | undefined> {
  const u = await loadUser(userId);
  return u?.activeBuyIns?.[tableId];
}

export async function recordTableBuyIn(userId: string, tableId: string, amount: number): Promise<void> {
  const u = await loadUser(userId);
  if (!u) return;
  if (!u.activeBuyIns) u.activeBuyIns = {};
  u.activeBuyIns[tableId] = amount;
  await saveUser(u);
}

export async function clearTableBuyIn(userId: string, tableId: string): Promise<void> {
  const u = await loadUser(userId);
  if (!u || !u.activeBuyIns) return;
  delete u.activeBuyIns[tableId];
  await saveUser(u);
}

export async function claimDailyChips(id: string, amount: number): Promise<{ success: boolean; nextClaimAt?: number }> {
  const u = await loadUser(id);
  if (!u) return { success: false };
  const now = Date.now();
  const cooldown = 1000 * 60 * 60 * 24;
  if (u.lastClaimAt && now - u.lastClaimAt < cooldown) {
    return { success: false, nextClaimAt: u.lastClaimAt + cooldown };
  }
  u.bankroll += amount;
  u.lastClaimAt = now;
  await saveUser(u);
  return { success: true };
}
