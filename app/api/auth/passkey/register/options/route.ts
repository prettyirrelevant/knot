import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { getConvexServerClient } from "@/app/api/auth/_lib/convex";
import {
  getExpectedOrigin,
  getRelyingPartyId,
  getRelyingPartyName,
} from "@/app/api/auth/_lib/passkey-config";
import { getSessionFromRequest } from "@/app/api/auth/_lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }

  const convex = getConvexServerClient();
  const playerId = session.playerId as Id<"players">;

  const player = await convex.query(api.players.getPlayerById, { playerId });
  if (!player) {
    return NextResponse.json({ ok: false, reason: "PLAYER_NOT_FOUND" }, { status: 404 });
  }

  const existingCredentials = await convex.query(api.passkeys.listCredentialsForPlayer, {
    playerId,
  });

  const options = await generateRegistrationOptions({
    rpName: getRelyingPartyName(),
    rpID: getRelyingPartyId(request),
    userID: new TextEncoder().encode(String(player._id)),
    userName: player.displayName,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existingCredentials.map((credential: { id: string }) => ({
      id: credential.id,
      type: "public-key" as const,
    })),
  });

  await convex.mutation(api.passkeys.createChallenge, {
    challenge: options.challenge,
    flow: "register",
    playerId,
  });

  return NextResponse.json({
    ok: true,
    options,
    expectedOrigin: getExpectedOrigin(request),
  });
}
