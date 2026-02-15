import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { getConvexServerClient } from "@/app/api/auth/_lib/convex";
import { getExpectedOrigin, getRelyingPartyId } from "@/app/api/auth/_lib/passkey-config";
import { getSessionFromRequest, setSessionCookie } from "@/app/api/auth/_lib/session";

export const runtime = "nodejs";

type VerifyRegistrationBody = {
  challenge?: string;
  response?: Parameters<typeof verifyRegistrationResponse>[0]["response"];
};

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as VerifyRegistrationBody | null;
  if (!body?.challenge || !body.response) {
    return NextResponse.json({ ok: false, reason: "INVALID_REQUEST" }, { status: 400 });
  }

  const convex = getConvexServerClient();
  const playerId = session.playerId as Id<"players">;

  const consumed = await convex.mutation(api.passkeys.consumeChallenge, {
    challenge: body.challenge,
    flow: "register",
    playerId,
  });

  if (!consumed.ok) {
    return NextResponse.json({ ok: false, reason: consumed.reason }, { status: 400 });
  }

  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: body.challenge,
    expectedOrigin: getExpectedOrigin(request),
    expectedRPID: getRelyingPartyId(request),
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ ok: false, reason: "VERIFICATION_FAILED" }, { status: 400 });
  }

  const { registrationInfo } = verification;
  const credential = registrationInfo.credential;

  const result = await convex.mutation(api.passkeys.upsertCredential, {
    playerId,
    credentialID: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    deviceType: registrationInfo.credentialDeviceType,
    backedUp: registrationInfo.credentialBackedUp,
    transports: credential.transports,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }

  const player = await convex.query(api.players.getPlayerById, { playerId });
  if (!player) {
    return NextResponse.json({ ok: false, reason: "PLAYER_NOT_FOUND" }, { status: 404 });
  }

  const response = NextResponse.json({
    ok: true,
    player: {
      id: String(player._id),
      displayName: player.displayName,
      identityTier: player.identityTier ?? "secured",
    },
  });
  setSessionCookie(response, String(player._id));
  return response;
}
