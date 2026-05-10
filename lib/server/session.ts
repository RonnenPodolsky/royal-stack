import { cookies } from "next/headers";
import { getOrCreateUser, type UserRecord } from "./users";

const COOKIE_NAME = "rs_uid";

export async function getOrCreateSessionUser(): Promise<UserRecord> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value ?? null;
  // proxy.ts is responsible for ensuring the cookie exists. We just read it
  // here and create the in-memory user record on first read.
  return getOrCreateUser(existing);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}
