"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import Select, { type StylesConfig } from "react-select";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toPlayerId } from "@/lib/convex-helpers";
import { formatDateFull } from "@/lib/format";
import { baseSelectStyles } from "@/lib/select-styles";

const LIST_PLAYERS = api.players.listPlayers;
const GET_H2H = api.ratings.getHeadToHead;
const GET_H2H_DETAILS = api.ratings.getHeadToHeadDetails;

type Opponent = { _id: string; displayName: string };
type OpponentOption = { value: string; label: string };

const opponentSelectStyles: StylesConfig<OpponentOption, false> = {
  ...baseSelectStyles<OpponentOption>({
    control: {
      borderRadius: "999px",
      background: "var(--surface-input)",
      cursor: "text",
      padding: "0.1rem 0.4rem",
      fontSize: "1rem",
    },
    menu: { zIndex: 110 },
    valueContainer: { padding: "0.3rem 0.45rem" },
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
  dropdownIndicator: () => ({ display: "none" }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--ink-500)",
    padding: "0 4px",
    "&:hover": { color: "var(--ink-900)" },
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

export function HeadToHead({ storePlayerId }: { storePlayerId: string }) {
  const [opponentId, setOpponentId] = useState("");

  const playerIdRef = toPlayerId(storePlayerId);
  const players = useQuery(LIST_PLAYERS, { limit: 100 });

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

  return (
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
          <H2HResults
            h2h={h2h}
            h2hDetails={h2hDetails}
            storePlayerId={storePlayerId}
            opponentId={opponentId}
            opponentName={candidateOpponents.find((o) => o._id === opponentId)?.displayName ?? "Opponent"}
          />
        ) : (
          <p className="feedback-line" style={{ marginTop: "1rem" }}>No games played against this opponent yet.</p>
        )
      ) : (
        <p className="feedback-line" style={{ marginTop: "1rem" }}>Pick a rival to see your record against them.</p>
      )}
    </div>
  );
}

function H2HResults({
  h2h,
  h2hDetails,
  storePlayerId,
  opponentId,
  opponentName,
}: {
  h2h: { lowWins: number; highWins: number; draws: number };
  h2hDetails: { lastPlayedAt: number | null; currentStreak: number; bestStreak: number; bySize: { size: number; wins: number; losses: number; draws: number }[] } | undefined | null;
  storePlayerId: string;
  opponentId: string;
  opponentName: string;
}) {
  const [low] = [storePlayerId, opponentId].sort();
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
}
