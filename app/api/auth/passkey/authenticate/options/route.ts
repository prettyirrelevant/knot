import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";

import { getConvexServerClient } from "@/app/api/auth/_lib/convex";
import { getExpectedOrigin, getRelyingPartyId } from "@/app/api/auth/_lib/passkey-config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const options = await generateAuthenticationOptions({
    rpID: getRelyingPartyId(request),
    userVerification: "preferred",
  });

  const convex = getConvexServerClient();
  await convex.mutation(api.passkeys.createChallenge, {
    challenge: options.challenge,
    flow: "authenticate",
  });

  return NextResponse.json({
    ok: true,
    options,
    expectedOrigin: getExpectedOrigin(request),
  });
}
