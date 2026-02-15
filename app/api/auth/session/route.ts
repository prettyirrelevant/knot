import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { getConvexServerClient } from "../_lib/convex";
import { clearSessionCookie, getSessionFromRequest, setSessionCookie } from "../_lib/session";

export const runtime = "nodejs";

type IdentityTier = "guest" | "secured";

type SessionPlayer = {
  id: string;
  displayName: string;
  identityTier: IdentityTier;
};

function toSessionPlayer(player: {
  _id: Id<"players">;
  displayName: string;
  identityTier?: IdentityTier;
}): SessionPlayer {
  return {
    id: String(player._id),
    displayName: String(player.displayName),
    identityTier: player.identityTier ?? "guest",
  };
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const convex = getConvexServerClient();
  const player = await convex.query(api.players.getPlayerById, {
    playerId: session.playerId as Id<"players">,
  });

  if (!player) {
    const response = NextResponse.json({ authenticated: false });
    clearSessionCookie(response);
    return response;
  }

  const response = NextResponse.json({
    authenticated: true,
    player: toSessionPlayer(player),
  });

  setSessionCookie(response, String(player._id));
  return response;
}
