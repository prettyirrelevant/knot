import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";

import { getConvexServerClient } from "@/app/api/auth/_lib/convex";
import { getExpectedOrigin, getRelyingPartyId } from "@/app/api/auth/_lib/passkey-config";
import { setSessionCookie } from "@/app/api/auth/_lib/session";

export const runtime = "nodejs";

type VerifyAuthenticationBody = {
  challenge?: string;
  response?: Parameters<typeof verifyAuthenticationResponse>[0]["response"];
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as VerifyAuthenticationBody | null;
  if (!body?.challenge || !body.response) {
    return NextResponse.json({ ok: false, reason: "INVALID_REQUEST" }, { status: 400 });
  }

  const convex = getConvexServerClient();
  const consumed = await convex.mutation(api.passkeys.consumeChallenge, {
    challenge: body.challenge,
    flow: "authenticate",
  });

  if (!consumed.ok) {
    return NextResponse.json({ ok: false, reason: consumed.reason }, { status: 400 });
  }

  const credentialID = body.response.id;
  const credentialDoc = await convex.query(api.passkeys.getCredentialByCredentialId, {
    credentialID,
  });

  if (!credentialDoc) {
    return NextResponse.json({ ok: false, reason: "CREDENTIAL_NOT_FOUND" }, { status: 404 });
  }

  const verification = await verifyAuthenticationResponse({
    response: body.response,
    expectedChallenge: body.challenge,
    expectedOrigin: getExpectedOrigin(request),
    expectedRPID: getRelyingPartyId(request),
    credential: {
      id: credentialDoc.credentialID,
      publicKey: isoBase64URL.toBuffer(credentialDoc.publicKey),
      counter: credentialDoc.counter,
      transports: credentialDoc.transports,
    },
  });

  if (!verification.verified) {
    return NextResponse.json({ ok: false, reason: "VERIFICATION_FAILED" }, { status: 400 });
  }

  const authenticated = await convex.mutation(api.passkeys.recordAuthentication, {
    credentialID,
    newCounter: verification.authenticationInfo.newCounter,
  });

  if (!authenticated.ok || !authenticated.player) {
    return NextResponse.json({ ok: false, reason: authenticated.reason }, { status: 400 });
  }

  const response = NextResponse.json({
    ok: true,
    player: {
      id: String(authenticated.player._id),
      displayName: String(authenticated.player.displayName),
      identityTier: authenticated.player.identityTier ?? "secured",
    },
  });

  setSessionCookie(response, String(authenticated.player._id));
  return response;
}
