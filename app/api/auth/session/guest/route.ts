import { NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { getConvexServerClient } from "../../_lib/convex";
import { setSessionCookie } from "../../_lib/session";

export const runtime = "nodejs";

type AttachBody = {
  playerId?: string;
  guestSecret?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AttachBody | null;
  const playerId = body?.playerId?.trim();
  const guestSecret = body?.guestSecret?.trim();

  if (!playerId || !guestSecret) {
    return NextResponse.json({ ok: false, reason: "INVALID_REQUEST" }, { status: 400 });
  }

  const convex = getConvexServerClient();
  const result = await convex.mutation(api.players.validateGuestSession, {
    playerId: playerId as Id<"players">,
    guestSecret,
  });

  if (!result.ok || !result.player) {
    return NextResponse.json({ ok: false, reason: "INVALID_GUEST_CREDENTIALS" }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    player: {
      id: String(result.player._id),
      displayName: String(result.player.displayName),
      identityTier: result.player.identityTier ?? "guest",
    },
  });
  setSessionCookie(response, String(result.player._id));
  return response;
}
