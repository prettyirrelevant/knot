"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Archive, ArchiveRestore, Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toPlayerId } from "@/lib/convex-helpers";
import { relativeTime } from "@/lib/format";
import { useIdentityStore } from "@/stores/use-identity-store";

const GET_HISTORY = api.history.getPlayerHistory;
const ARCHIVE_MATCH = api.history.archiveMatch;
const UNARCHIVE_MATCH = api.history.unarchiveMatch;

type ResultFilter = "all" | "win" | "loss" | "draw" | "archived";

function SkeletonRows() {
  return (
    <div className="history-list">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="skeleton skeleton-leaderboard-row" />
      ))}
    </div>
  );
}

export function HistoryClient() {
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const storePlayerId = useIdentityStore((s) => s.playerId);
  const status = useIdentityStore((s) => s.status);
  const archiveMatch = useMutation(ARCHIVE_MATCH);
  const unarchiveMatch = useMutation(UNARCHIVE_MATCH);

  const playerIdRef = toPlayerId(storePlayerId);
  const history = useQuery(
    GET_HISTORY,
    playerIdRef ? { playerId: playerIdRef } : "skip",
  );

  const counts = useMemo(() => {
    if (!history) return { all: 0, win: 0, loss: 0, draw: 0, archived: 0 };
    const active = history.filter((m) => !m.archived);
    return {
      all: active.length,
      win: active.filter((m) => m.result === "win").length,
      loss: active.filter((m) => m.result === "loss").length,
      draw: active.filter((m) => m.result === "draw").length,
      archived: history.filter((m) => m.archived).length,
    };
  }, [history]);

  const groupedByGame = useMemo(() => {
    if (!history) return [];
    const map = new Map<string, typeof history>();
    const order: string[] = [];
    for (const round of history) {
      if (!map.has(round.matchId)) {
        map.set(round.matchId, []);
        order.push(round.matchId);
      }
      map.get(round.matchId)!.push(round);
    }
    return order.map((id) => map.get(id)!);
  }, [history]);

  const filteredGroups = useMemo(() => {
    return groupedByGame
      .map((rounds) => {
        const isArchived = rounds[0].archived;
        if (filter === "archived" && !isArchived) return null;
        if (filter !== "archived" && isArchived) return null;

        const visible = (filter === "all" || filter === "archived")
          ? rounds
          : rounds.filter((r) => r.result === filter);
        if (visible.length === 0) return null;

        const first = rounds[0];
        return {
          matchId: first.matchId,
          roomCode: first.roomCode,
          opponentName: first.opponentName,
          archived: isArchived,
          rounds,
          visibleRounds: visible,
          netElo: visible.reduce((s, r) => s + r.eloDelta, 0),
          latestPlayedAt: Math.max(...visible.map((r) => r.playedAt)),
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [groupedByGame, filter]);

  const summary = useMemo(() => {
    if (!history || history.length === 0) return null;
    const total = history.length;
    const wins = counts.win;
    const winRate = Math.round((wins / total) * 100);
    const netElo = history.reduce((sum, m) => sum + m.eloDelta, 0);
    const recentForm = history.slice(0, 5).map((m) => m.result);
    return { total, winRate, netElo, recentForm };
  }, [history, counts.win]);

  async function handleArchive(matchId: string) {
    if (!playerIdRef) return;
    setArchivingId(matchId);
    try {
      await archiveMatch({
        matchId: matchId as Id<"matches">,
        playerId: playerIdRef,
      });
      toast.success("Game archived.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't archive game.");
    } finally {
      setArchivingId(null);
    }
  }

  async function handleUnarchive(matchId: string) {
    if (!playerIdRef) return;
    setArchivingId(matchId);
    try {
      await unarchiveMatch({
        matchId: matchId as Id<"matches">,
        playerId: playerIdRef,
      });
      toast.success("Game unarchived.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't unarchive game.");
    } finally {
      setArchivingId(null);
    }
  }

  async function handleCopyLink(roomCode: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/g/${roomCode}`);
      setCopiedCode(roomCode);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setCopiedCode(null);
    }
  }

  if (status === "booting" || (playerIdRef && history === undefined)) {
    return <SkeletonRows />;
  }

  if (!playerIdRef) {
    return <p className="feedback-line">Could not load your identity. Try refreshing.</p>;
  }

  if (!history || history.length === 0) {
    return <p className="feedback-line" style={{ marginTop: "1rem" }}>No games played yet. Go start one!</p>;
  }

  const filterOptions: { key: ResultFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...([
      { key: "win" as const, label: "Wins" },
      { key: "loss" as const, label: "Losses" },
      { key: "draw" as const, label: "Draws" },
      { key: "archived" as const, label: "Archived" },
    ].sort((a, b) => counts[b.key] - counts[a.key])),
  ];

  return (
    <>
      {summary && (
        <div className="history-summary">
          <div className="history-summary-stat">
            <div className="history-summary-value">{summary.total}</div>
            <div className="history-summary-label">Games</div>
          </div>
          <div className="history-summary-stat">
            <div className="history-summary-value">{summary.winRate}%</div>
            <div className="history-summary-label">Win Rate</div>
          </div>
          <div className="history-summary-stat">
            <div className={`history-summary-value ${summary.netElo >= 0 ? "positive" : "negative"}`}>
              {summary.netElo >= 0 ? "+" : ""}{summary.netElo}
            </div>
            <div className="history-summary-label">Net Elo</div>
          </div>
          <div className="history-summary-stat">
            <div className="history-form-dots">
              {summary.recentForm.map((result, i) => (
                <span key={i} className={`history-form-dot ${result}`} />
              ))}
            </div>
            <div className="history-summary-label">Recent Form</div>
          </div>
        </div>
      )}

      <div className="history-filters">
        {filterOptions.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`history-filter-pill${filter === key ? " active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label} <span className="history-filter-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {filteredGroups.length === 0 ? (
        <p className="feedback-line" style={{ marginTop: "0.75rem" }}>
          No {filter} games to show.
        </p>
      ) : (
        <div className="history-list">
          {filteredGroups.map((group) =>
            group.visibleRounds.length === 1 ? (
              <article key={group.matchId} className="history-row">
                <span className={`history-result ${group.visibleRounds[0].result}`} />
                <span className="history-opponent">{group.opponentName}</span>
                <div className="history-trailing">
                  <span className={`elo-delta ${group.visibleRounds[0].eloDelta >= 0 ? "positive" : "negative"}`}>
                    {group.visibleRounds[0].eloDelta >= 0 ? "+" : ""}{group.visibleRounds[0].eloDelta}
                  </span>
                  <span className="history-time">{relativeTime(group.visibleRounds[0].playedAt)}</span>
                </div>
                {!group.archived && (
                  <button
                    type="button"
                    className="history-copy-btn"
                    onClick={() => void handleCopyLink(group.roomCode)}
                    aria-label="Copy game link"
                  >
                    {copiedCode === group.roomCode ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  className="history-archive-btn"
                  onClick={() => void (group.archived ? handleUnarchive(group.matchId) : handleArchive(group.matchId))}
                  disabled={archivingId === group.matchId}
                  aria-label={group.archived ? "Unarchive game" : "Archive game"}
                >
                  {group.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                </button>
              </article>
            ) : (
              <details key={group.matchId} className="history-game-group">
                <summary className="history-game-summary">
                  <span className="history-result-bar">
                    {group.visibleRounds.map((r, i) => (
                      <span key={i} className={`history-result-bar-seg ${r.result}`} />
                    ))}
                  </span>
                  <span className="history-opponent">{group.opponentName}</span>
                  <div className="history-trailing">
                    <span className={`elo-delta ${group.netElo >= 0 ? "positive" : "negative"}`}>
                      {group.netElo >= 0 ? "+" : ""}{group.netElo}
                    </span>
                    <span className="history-time">{relativeTime(group.latestPlayedAt)}</span>
                  </div>
                  {!group.archived && (
                    <button
                      type="button"
                      className="history-copy-btn"
                      onClick={(e) => { e.preventDefault(); void handleCopyLink(group.roomCode); }}
                      aria-label="Copy game link"
                    >
                      {copiedCode === group.roomCode ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="history-archive-btn"
                    onClick={(e) => { e.preventDefault(); void (group.archived ? handleUnarchive(group.matchId) : handleArchive(group.matchId)); }}
                    disabled={archivingId === group.matchId}
                    aria-label={group.archived ? "Unarchive game" : "Archive game"}
                  >
                    {group.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                </summary>
                <div className="history-game-rounds-wrapper">
                  <div className="history-game-rounds">
                    {group.visibleRounds.map((round) => (
                      <div key={round.roundNumber} className="history-round-row">
                        <span className={`history-result small ${round.result}`}>
                          {round.result === "win" ? "W" : round.result === "loss" ? "L" : "D"}
                        </span>
                        <span className="history-round-label">Round {round.roundNumber}</span>
                        <div className="history-trailing">
                          <span className={`elo-delta ${round.eloDelta >= 0 ? "positive" : "negative"}`}>
                            {round.eloDelta >= 0 ? "+" : ""}{round.eloDelta}
                          </span>
                          <span className="history-time">{relativeTime(round.playedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ),
          )}
        </div>
      )}
    </>
  );
}
