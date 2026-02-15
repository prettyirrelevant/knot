import { NextResponse } from "next/server";

import { clearSessionCookie } from "../_lib/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
