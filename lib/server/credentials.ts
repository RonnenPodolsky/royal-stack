import bcrypt from "bcryptjs";
import { loadJSON, saveJSON } from "./persistence";
import { getOrCreateUser, getUser, updateUserProfile } from "./users";

type CredRecord = {
  email: string;
  passwordHash: string;
  userId: string;
  createdAt: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function credKey(email: string): string {
  return `cred:${normalizeEmail(email)}`;
}

async function loadCred(email: string): Promise<CredRecord | null> {
  return loadJSON<CredRecord | null>(credKey(email), null);
}

async function saveCred(record: CredRecord): Promise<void> {
  await saveJSON(credKey(record.email), record);
}

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function registerCredentials(
  rawEmail: string,
  password: string,
  displayName?: string,
): Promise<RegisterResult> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@") || email.length < 3) {
    return { ok: false, error: "Invalid email" };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  if (await loadCred(email)) {
    return { ok: false, error: "Email already registered" };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await getOrCreateUser(null);
  await updateUserProfile(user.id, {
    displayName: displayName?.trim() || undefined,
    email,
  });
  const record: CredRecord = {
    email,
    passwordHash,
    userId: user.id,
    createdAt: Date.now(),
  };
  await saveCred(record);
  return { ok: true, userId: user.id };
}

export type VerifiedUser = { userId: string; email: string; displayName: string };

export async function verifyCredentials(
  rawEmail: string,
  password: string,
): Promise<VerifiedUser | null> {
  const email = normalizeEmail(rawEmail);
  const record = await loadCred(email);
  if (!record) return null;
  const ok = await bcrypt.compare(password, record.passwordHash);
  if (!ok) return null;
  const user = await getUser(record.userId);
  return {
    userId: record.userId,
    email,
    displayName: user?.displayName ?? "Player",
  };
}
