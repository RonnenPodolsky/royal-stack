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
    // Always create-or-fetch by NextAuth id. Never fall back to anon cookie
    // when authed, otherwise a missed persist (debounce, function teardown)
    // can momentarily mask the real user, and subsequent calls that use the
    // JWT id directly would see a different identity.
    return getOrCreateUser(session.user.id);
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
