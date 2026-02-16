"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { AccountActions } from "@/app/account-actions";
import { HeadToHead } from "@/app/profile/head-to-head";
import { api } from "@/convex/_generated/api";
import { toPlayerId } from "@/lib/convex-helpers";
import { formatDate } from "@/lib/format";
import { useIdentityStore } from "@/stores/use-identity-store";

const GET_PLAYER = api.players.getPlayerById;
const GET_RATING = api.ratings.getPlayerRating;
const UPDATE_NAME = api.players.updateDisplayName;

function SkeletonBooting() {
  return (
    <section className="glass-panel profile-shell">
      <p className="kicker">Profile</p>
      <div className="skeleton skeleton-text" style={{ width: "14rem", height: "2.8rem", marginTop: "0.5rem" }} />
      <div className="profile-stats">
        <div className="skeleton skeleton-stat" />
        <div className="skeleton skeleton-stat" />
        <div className="skeleton skeleton-stat" />
      </div>
      <div className="profile-section">
        <div className="skeleton skeleton-text" style={{ width: "8rem", height: "0.9rem" }} />
        <div className="skeleton skeleton-tile" style={{ marginTop: "1rem", height: "10rem" }} />
      </div>
    </section>
  );
}

export function ProfileClient() {
  const [editingName, setEditingName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const storePlayerId = useIdentityStore((s) => s.playerId);
  const storeIdentityTier = useIdentityStore((s) => s.identityTier);
  const status = useIdentityStore((s) => s.status);

  const playerIdRef = toPlayerId(storePlayerId);
  const player = useQuery(GET_PLAYER, playerIdRef ? { playerId: playerIdRef } : "skip");
  const rating = useQuery(GET_RATING, playerIdRef ? { playerId: playerIdRef } : "skip");
  const updateName = useMutation(UPDATE_NAME);

  if (status === "booting" || (playerIdRef && player === undefined)) {
    return <SkeletonBooting />;
  }

  if (!playerIdRef) {
    return (
      <section className="glass-panel profile-shell">
        <p className="kicker">Profile</p>
        <h1 className="display">No Player Found</h1>
        <p className="feedback-line">Something went wrong loading your identity. Try refreshing.</p>
      </section>
    );
  }

  const displayName = player?.displayName ?? "...";

  async function saveName() {
    setIsEditing(false);
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === displayName || !playerIdRef) return;
    try {
      const result = await updateName({
        playerId: playerIdRef,
        displayName: trimmed,
      });
      useIdentityStore.getState().setIdentity(
        { id: storePlayerId!, displayName: result.displayName, identityTier: storeIdentityTier },
      );
    } catch {
      setEditingName(displayName);
      toast.error("Couldn't save name");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditingName(displayName);
      inputRef.current?.blur();
    }
  }

  return (
    <section className="glass-panel profile-shell">
      <p className="kicker">Profile</p>

      <div className="profile-name-row">
        <input
          ref={inputRef}
          className="profile-name-input display"
          value={isEditing ? editingName : displayName}
          maxLength={30}
          onChange={(e) => setEditingName(e.target.value)}
          onFocus={() => { setIsEditing(true); setEditingName(displayName); }}
          onBlur={() => saveName()}
          onKeyDown={handleKeyDown}
        />
        <Pencil size={16} className="profile-name-hint" onClick={() => inputRef.current?.focus()} />
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat-value">
            {rating ? Math.round(rating.elo).toLocaleString() : "\u2014"}
          </div>
          <div className="profile-stat-label">Elo Rating</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">
            {rating?.gamesPlayed ?? 0}
          </div>
          <div className="profile-stat-label">Games Played</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">
            {player?.createdAt ? formatDate(player.createdAt) : "\u2014"}
          </div>
          <div className="profile-stat-label">Joined</div>
        </div>
      </div>

      <div className="profile-section">
        <AccountActions />
      </div>

      <HeadToHead storePlayerId={storePlayerId!} />
    </section>
  );
}
