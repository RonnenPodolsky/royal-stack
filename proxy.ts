import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

const COOKIE_NAME = "rs_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function proxy(req: NextRequest) {
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  const res = NextResponse.next();
  if (!existing) {
    const id = randomBytes(12).toString("hex");
    res.cookies.set({
      name: COOKIE_NAME,
      value: id,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    // Also expose to the current request so the page sees it on first hit.
    req.cookies.set(COOKIE_NAME, id);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
