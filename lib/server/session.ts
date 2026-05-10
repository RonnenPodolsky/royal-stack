import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrCreateUser, getUser, type UserRecord } from "./users";

const COOKIE_NAME = "rs_uid";

/**
 * Returns the current session user. Preference order:
 *   1. NextAuth-authenticated user (registered account)
 *   2. Anonymous cookie identity (guest mode set by proxy.ts)
 * Always returns a user record, creating one if neither exists.
 */
export async function getOrCreateSessionUser(): Promise<UserRecord> {
  const session = await auth();
  if (session?.user?.id) {
    const u = await getUser(session.user.id);
    if (u) return u;
    // Fallthrough: stale token referencing a deleted user → fall back to anon cookie
  }
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value ?? null;
  return getOrCreateUser(existing);
}

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/** True when the user is authenticated via NextAuth (not just anonymous). */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user?.id);
}
