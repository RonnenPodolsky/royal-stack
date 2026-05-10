import { NextResponse } from "next/server";
import { getSessionUserId, isAuthenticated } from "@/lib/server/session";
import { claimDailyChips, getUser } from "@/lib/server/users";

const DAILY_AMOUNT = 5000;

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const result = await claimDailyChips(userId, DAILY_AMOUNT);
  if (!result.success) {
    return NextResponse.json(
      { error: "Already claimed", nextClaimAt: result.nextClaimAt },
      { status: 400 },
    );
  }
  const user = await getUser(userId);
  return NextResponse.json({ ok: true, bankroll: user?.bankroll ?? null, awarded: DAILY_AMOUNT });
}
