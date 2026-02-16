import type { Id } from "@/convex/_generated/dataModel";

export function toPlayerId(value: string | null): Id<"players"> | null {
  return value ? (value as Id<"players">) : null;
}
