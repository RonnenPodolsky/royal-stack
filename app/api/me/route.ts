import { NextResponse } from "next/server";
import { getOrCreateSessionUser } from "@/lib/server/session";

export async function GET() {
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
