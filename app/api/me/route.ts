import { NextResponse } from "next/server";
import { getOrCreateSessionUser, isAuthenticated } from "@/lib/server/session";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const user = await getOrCreateSessionUser();
  return NextResponse.json({
    id: user.id,
    displayName: user.displayName,
    bankroll: user.bankroll,
    handsPlayed: user.handsPlayed,
    biggestPot: user.biggestPot,
    netProfit: user.netProfit,
    lastClaimAt: user.lastClaimAt,
  });
}
