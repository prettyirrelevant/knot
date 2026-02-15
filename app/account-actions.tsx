"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";

import { registerCurrentAccountPasskey, restoreAccountWithPasskey } from "@/lib/auth/client";
import { writeIdentityCache } from "@/lib/auth/identity-cache";
import { useIdentityStore } from "@/stores/use-identity-store";

export function AccountActions() {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const [busyAction, setBusyAction] = useState<"secure" | "restore" | null>(null);

  const status = useIdentityStore((state) => state.status);
  const playerId = useIdentityStore((state) => state.playerId);
  const displayName = useIdentityStore((state) => state.displayName);
  const identityTier = useIdentityStore((state) => state.identityTier);
  const setIdentity = useIdentityStore((state) => state.setIdentity);

  if (!hasConvexUrl) {
    return null;
  }

  if (status === "booting") {
    return <div className="skeleton skeleton-text" style={{ width: "8rem" }} />;
  }

  if (!playerId || !displayName) {
    return null;
  }

  const isGuest = identityTier !== "secured";

  async function handleSecureAccount() {
    setBusyAction("secure");
    try {
      const result = await registerCurrentAccountPasskey();
      if (!result.ok || !result.player) {
        throw new Error(result.reason ?? "Something went wrong. Try again.");
      }

      setIdentity(result.player, null);
      writeIdentityCache({
        playerId: result.player.id,
        guestSecret: null,
      });
      toast.success("Account secured. You can sign in from any device now.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRestore() {
    setBusyAction("restore");
    try {
      const result = await restoreAccountWithPasskey();
      if (!result.ok || !result.player) {
        throw new Error(result.reason ?? "Couldn't restore your account. Try again.");
      }

      setIdentity(result.player, null);
      writeIdentityCache({
        playerId: result.player.id,
        guestSecret: null,
      });
      toast.success("Account restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't restore your account. Try again.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <details className="info-group" aria-label="Account controls">
      <summary className="info-group-title">
        <UserRound size={14} />
        {displayName}
      </summary>
      <div className="info-group-body">
        <div className="info-item rule-actions">
          {isGuest && (
            <button
              className="button primary"
              type="button"
              onClick={() => void handleSecureAccount()}
              disabled={busyAction !== null}
            >
              {busyAction === "secure" ? "Securing..." : "Secure with Passkey"}
            </button>
          )}
          <button
            className="button"
            type="button"
            onClick={() => void handleRestore()}
            disabled={busyAction !== null}
          >
            {busyAction === "restore" ? "Restoring..." : "Restore Account"}
          </button>
        </div>
      </div>
    </details>
  );
}
