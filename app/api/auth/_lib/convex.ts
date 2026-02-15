import { ConvexHttpClient } from "convex/browser";

export function getConvexServerClient() {
  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!deploymentUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for auth routes.");
  }
  return new ConvexHttpClient(deploymentUrl);
}
