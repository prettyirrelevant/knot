import type { NextRequest } from "next/server";

const DEFAULT_RP_NAME = "Knot";

function stripPort(host: string) {
  return host.replace(/:\d+$/, "");
}

export function getRelyingPartyId(request: NextRequest) {
  return process.env.PASSKEY_RP_ID || stripPort(request.nextUrl.host);
}

export function getExpectedOrigin(request: NextRequest) {
  const configured = process.env.PASSKEY_ORIGIN;
  if (configured) {
    return configured;
  }

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    return originHeader;
  }

  return request.nextUrl.origin;
}

export function getRelyingPartyName() {
  return process.env.PASSKEY_RP_NAME || DEFAULT_RP_NAME;
}
