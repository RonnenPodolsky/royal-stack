import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrCreateUser, getUser, updateUserProfile, type UserRecord } from "./users";

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
    // when authed, otherwise a missed persist can momentarily mask the real
    // user.
    const user = await getOrCreateUser(session.user.id);
    // Backfill profile fields from the JWT session if our record is missing
    // them. This covers the case where the user record was reset (data wipe,
    // schema change) but the JWT cookie is still valid — without this, the
    // user appears as the default Player_xxxx with no avatar until they sign
    // out and back in.
    const updates: { displayName?: string; avatarUrl?: string; email?: string } = {};
    if (!user.avatarUrl && session.user.image) updates.avatarUrl = session.user.image;
    if (!user.email && session.user.email) updates.email = session.user.email;
    if (session.user.name && user.displayName.startsWith("Player_")) {
      updates.displayName = session.user.name;
    }
    if (Object.keys(updates).length > 0) {
      await updateUserProfile(user.id, updates);
      return (await getUser(user.id)) ?? user;
    }
    return user;
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
