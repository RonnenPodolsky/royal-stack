import bcrypt from "bcryptjs";
import { loadJSON, scheduleSave } from "./persistence";
import { getOrCreateUser, getUser } from "./users";

type CredRecord = {
  email: string;
  passwordHash: string;
  userId: string;
  createdAt: number;
};

const CREDS_FILE = "credentials.json";
const initial = loadJSON<Record<string, CredRecord>>(CREDS_FILE, {});
const creds = new Map<string, CredRecord>(Object.entries(initial));

function persist(): void {
  scheduleSave(CREDS_FILE, () => Object.fromEntries(creds.entries()));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  if (creds.has(email)) {
    return { ok: false, error: "Email already registered" };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = getOrCreateUser(null);
  if (displayName) user.displayName = displayName;
  const record: CredRecord = {
    email,
    passwordHash,
    userId: user.id,
    createdAt: Date.now(),
  };
  creds.set(email, record);
  persist();
  return { ok: true, userId: user.id };
}

export type VerifiedUser = { userId: string; email: string; displayName: string };

export async function verifyCredentials(
  rawEmail: string,
  password: string,
): Promise<VerifiedUser | null> {
  const email = normalizeEmail(rawEmail);
  const record = creds.get(email);
  if (!record) return null;
  const ok = await bcrypt.compare(password, record.passwordHash);
  if (!ok) return null;
  const user = getUser(record.userId);
  return {
    userId: record.userId,
    email,
    displayName: user?.displayName ?? "Player",
  };
}
