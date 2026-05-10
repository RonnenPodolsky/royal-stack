import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";
import { actAtTable, getMySeatIdx, getPublicState } from "@/lib/server/tables";
import type { Action } from "@/lib/poker/types";

function parseAction(body: unknown): Action | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.type !== "string") return null;
  switch (b.type) {
    case "fold":
    case "check":
    case "call":
    case "allin":
      return { type: b.type };
    case "bet": {
      const amount = Number(b.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000_000) return null;
      return { type: "bet", amount: Math.floor(amount) };
    }
    case "raise": {
      const amount = Number(b.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000_000) return null;
      return { type: "raise", amount: Math.floor(amount) };
    }
    default:
      return null;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = parseAction(body);
  if (!action) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const result = await actAtTable({ tableId: id, userId, action });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const state = getPublicState({ tableId: id, userId });
  const seatIdx = getMySeatIdx({ tableId: id, userId });
  return NextResponse.json({ state, mySeatIdx: seatIdx });
}
