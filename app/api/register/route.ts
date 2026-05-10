import { NextResponse } from "next/server";
import { registerCredentials } from "@/lib/server/credentials";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const result = await registerCredentials(
    String(body.email ?? ""),
    String(body.password ?? ""),
    body.displayName ? String(body.displayName) : undefined,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, userId: result.userId });
}
