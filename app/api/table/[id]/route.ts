import { NextResponse } from "next/server";
import { getOrCreateSessionUser, isAuthenticated } from "@/lib/server/session";
import { getMySeatIdx, getPublicState, joinTable } from "@/lib/server/tables";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const user = await getOrCreateSessionUser();

  // Auto-join if not already seated
  const result = await joinTable({ tableId: id, userId: user.id });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const state = getPublicState({ tableId: id, userId: user.id });
  const seatIdx = getMySeatIdx({ tableId: id, userId: user.id });
  if (!state || seatIdx === null) {
    return NextResponse.json({ error: "Could not load table" }, { status: 500 });
  }
  return NextResponse.json({ state, mySeatIdx: seatIdx, bankroll: user.bankroll });
}
