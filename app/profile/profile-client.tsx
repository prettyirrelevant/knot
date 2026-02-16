"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Pencil } from "lucide-react";
import Select, { type StylesConfig } from "react-select";
import { toast } from "sonner";

import { AccountActions } from "@/app/account-actions";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useIdentityStore } from "@/stores/use-identity-store";

const GET_PLAYER = api.players.getPlayerById;
const GET_RATING = api.ratings.getPlayerRating;
const LIST_PLAYERS = api.players.listPlayers;
const GET_H2H = api.ratings.getHeadToHead;
const GET_H2H_DETAILS = api.ratings.getHeadToHeadDetails;
const UPDATE_NAME = api.players.updateDisplayName;

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatDateFull(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


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

type Opponent = { _id: string; displayName: string };
type OpponentOption = { value: string; label: string };

const opponentSelectStyles: StylesConfig<OpponentOption, false> = {
  control: (base, state) => ({
    ...base,
    border: `1px solid ${state.isFocused ? "var(--accent)" : "var(--line)"}`,
    borderRadius: "999px",
    background: "var(--surface-input)",
    boxShadow: state.isFocused ? "0 0 0 3px var(--accent-soft)" : "none",
    cursor: "text",
    minHeight: "unset",
    padding: "0.1rem 0.4rem",
    fontSize: "0.88rem",
    fontFamily: "inherit",
    "&:hover": { borderColor: "var(--border-strong)" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "12px",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
    background: "var(--paper-bright)",
    zIndex: 10,
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  option: (base, state) => ({
    ...base,
    padding: "0.55rem 0.75rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    background: state.isSelected
      ? "var(--accent-soft)"
      : state.isFocused
        ? "var(--surface-solid)"
        : "transparent",
    color: "var(--ink-900)",
    fontWeight: state.isSelected ? 600 : 400,
    "&:active": { background: "var(--accent-soft)" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: () => ({ display: "none" }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--ink-500)",
    padding: "0 4px",
    "&:hover": { color: "var(--ink-900)" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0.3rem 0.45rem",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--ink-500)",
  }),
  input: (base) => ({
    ...base,
    color: "var(--ink-900)",
  }),
};

function OpponentSearch({
  opponents,
  selectedId,
  onSelect,
}: {
  opponents: Opponent[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const options = useMemo(
    () => opponents.map((o) => ({ value: o._id, label: o.displayName })),
    [opponents],
  );

  return (
    <div style={{ width: "100%", marginTop: "0.75rem" }}>
      <Select<OpponentOption, false>
        options={options}
        value={options.find((o) => o.value === selectedId) ?? null}
        onChange={(option) => onSelect(option?.value ?? "")}
        styles={opponentSelectStyles}
        isClearable
        isSearchable
        placeholder="Search opponent..."
        noOptionsMessage={() => "No matches"}
      />
    </div>
  );
}

export function ProfileClient() {
  const [opponentId, setOpponentId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const storePlayerId = useIdentityStore((s) => s.playerId);
  const storeIdentityTier = useIdentityStore((s) => s.identityTier);
  const status = useIdentityStore((s) => s.status);

  const playerIdRef = storePlayerId ? (storePlayerId as Id<"players">) : null;
  const player = useQuery(GET_PLAYER, playerIdRef ? { playerId: playerIdRef } : "skip");
  const rating = useQuery(GET_RATING, playerIdRef ? { playerId: playerIdRef } : "skip");
  const players = useQuery(LIST_PLAYERS, { limit: 100 });
  const updateName = useMutation(UPDATE_NAME);

  const opponentIdRef = opponentId ? (opponentId as Id<"players">) : null;
  const shouldLoadH2h = Boolean(playerIdRef && opponentIdRef && opponentId !== storePlayerId);

  const h2h = useQuery(
    GET_H2H,
    shouldLoadH2h && playerIdRef && opponentIdRef
      ? { playerAId: playerIdRef, playerBId: opponentIdRef }
      : "skip",
  );

  const h2hDetails = useQuery(
    GET_H2H_DETAILS,
    shouldLoadH2h && playerIdRef && opponentIdRef
      ? { playerAId: playerIdRef, playerBId: opponentIdRef }
      : "skip",
  );

  const candidateOpponents = useMemo(() => {
    return (players ?? [])
      .filter((c) => String(c._id) !== storePlayerId)
      .map((c) => ({
        _id: String(c._id),
        displayName: String(c.displayName ?? c._id),
      }));
  }, [players, storePlayerId]);

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

      <div className="profile-section">
        <p className="kicker">Head to Head</p>
        <OpponentSearch
          opponents={candidateOpponents}
          selectedId={opponentId}
          onSelect={setOpponentId}
        />

        {opponentId ? (
          h2h === undefined ? (
            <div className="skeleton skeleton-tile" style={{ marginTop: "1rem", height: "10rem" }} />
          ) : h2h ? (
            (() => {
              const opponentName = candidateOpponents.find((o) => o._id === opponentId)?.displayName ?? "Opponent";
              const [low] = [storePlayerId!, opponentId].sort();
              const yourWins = low === storePlayerId ? Number(h2h.lowWins) : Number(h2h.highWins);
              const theirWins = low === storePlayerId ? Number(h2h.highWins) : Number(h2h.lowWins);
              const draws = Number(h2h.draws);
              const total = yourWins + theirWins + draws;

              return (
                <>
                  <div className="h2h-card">
                    <div className="h2h-names">
                      <span>You</span>
                      <span>{opponentName}</span>
                    </div>
                    <div className="h2h-score">
                      <span>{yourWins}</span>
                      <span className="h2h-score-dash">&mdash;</span>
                      <span>{theirWins}</span>
                    </div>
                    {total > 0 && (
                      <div className="h2h-bar">
                        {yourWins > 0 && <div className="h2h-bar-you" style={{ flex: yourWins }} />}
                        {draws > 0 && <div className="h2h-bar-draw" style={{ flex: draws }} />}
                        {theirWins > 0 && <div className="h2h-bar-them" style={{ flex: theirWins }} />}
                      </div>
                    )}
                    <p className="h2h-summary">
                      {total} played
                      {draws > 0 && ` · ${draws} draw${draws !== 1 ? "s" : ""}`}
                      {h2hDetails?.lastPlayedAt && ` · played ${formatDateFull(h2hDetails.lastPlayedAt)}`}
                    </p>
                  </div>
                  {h2hDetails && (
                    <>
                      {(h2hDetails.currentStreak > 0 || h2hDetails.bestStreak > 0) && (
                        <div className="h2h-meta-row">
                          {h2hDetails.currentStreak > 0 && (
                            <div className="h2h-meta-stat">
                              <div className="h2h-meta-value">{h2hDetails.currentStreak}</div>
                              <div className="h2h-meta-label">Current Streak</div>
                            </div>
                          )}
                          {h2hDetails.bestStreak > 0 && (
                            <div className="h2h-meta-stat">
                              <div className="h2h-meta-value">{h2hDetails.bestStreak}</div>
                              <div className="h2h-meta-label">Best Streak</div>
                            </div>
                          )}
                        </div>
                      )}
                      {h2hDetails.bySize.length > 0 && (
                        <details className="h2h-detail">
                          <summary className="h2h-detail-toggle">By board size</summary>
                          <div className="h2h-size-list">
                            <div className="h2h-size-list-header">
                              <span>Size</span>
                              <span>W</span>
                              <span>L</span>
                              <span>D</span>
                              <span>Win %</span>
                            </div>
                            {h2hDetails.bySize.map((row) => {
                              const sizeTotal = row.wins + row.losses + row.draws;
                              const sizeWinRate = sizeTotal > 0 ? Math.round((row.wins / sizeTotal) * 100) : 0;
                              return (
                                <div key={row.size} className="h2h-size-list-row">
                                  <span className="h2h-size-list-label">{row.size}x{row.size}</span>
                                  <span className="h2h-size-list-val win">{row.wins}</span>
                                  <span className="h2h-size-list-val loss">{row.losses}</span>
                                  <span className="h2h-size-list-val draw">{row.draws}</span>
                                  <span className="h2h-size-list-rate">{sizeWinRate}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </>
                  )}
                </>
              );
            })()
          ) : (
            <p className="feedback-line" style={{ marginTop: "1rem" }}>No games played against this opponent yet.</p>
          )
        ) : (
          <p className="feedback-line" style={{ marginTop: "1rem" }}>Pick a rival to see your record against them.</p>
        )}
      </div>
    </section>
  );
}
