"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Archive } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useIdentityStore } from "@/stores/use-identity-store";

const GET_HISTORY = api.history.getPlayerHistory;
const ARCHIVE_MATCH = api.history.archiveMatch;

type ResultFilter = "all" | "win" | "loss" | "draw";

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
  const storePlayerId = useIdentityStore((s) => s.playerId);
  const status = useIdentityStore((s) => s.status);
  const archiveMatch = useMutation(ARCHIVE_MATCH);

  const playerIdRef = storePlayerId ? (storePlayerId as Id<"players">) : null;
  const history = useQuery(
    GET_HISTORY,
    playerIdRef ? { playerId: playerIdRef } : "skip",
  );

  const counts = useMemo(() => {
    if (!history) return { all: 0, win: 0, loss: 0, draw: 0 };
    return {
      all: history.length,
      win: history.filter((m) => m.result === "win").length,
      loss: history.filter((m) => m.result === "loss").length,
      draw: history.filter((m) => m.result === "draw").length,
    };
  }, [history]);

  const filtered = useMemo(
    () => {
      if (!history) return [];
      return filter === "all" ? history : history.filter((m) => m.result === filter);
    },
    [history, filter],
  );

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
      toast.success("Match archived.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't archive match.");
    } finally {
      setArchivingId(null);
    }
  }

  if (status === "booting" || (playerIdRef && history === undefined)) {
    return <SkeletonRows />;
  }

  if (!playerIdRef) {
    return <p className="feedback-line">Could not load your identity. Try refreshing.</p>;
  }

  if (!history || history.length === 0) {
    return <p className="feedback-line" style={{ marginTop: "1rem" }}>No matches played yet. Go play some games!</p>;
  }

  const filterOptions: { key: ResultFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "win", label: "Wins" },
    { key: "loss", label: "Losses" },
    { key: "draw", label: "Draws" },
  ];

  return (
    <>
      {summary && (
        <div className="history-summary">
          <div className="history-summary-stat">
            <div className="history-summary-value">{summary.total}</div>
            <div className="history-summary-label">Matches</div>
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

      {filtered.length === 0 ? (
        <p className="feedback-line" style={{ marginTop: "0.75rem" }}>
          No {filter} matches to show.
        </p>
      ) : (
        <div className="history-list">
          {filtered.map((match) => (
            <article key={match.matchId} className="history-row">
              <span className={`history-result ${match.result}`}>
                {match.result === "win" ? "W" : match.result === "loss" ? "L" : "D"}
              </span>
              <span className="history-opponent">{match.opponentName}</span>
              <div className="history-trailing">
                <span className={`elo-delta ${match.eloDelta >= 0 ? "positive" : "negative"}`}>
                  {match.eloDelta >= 0 ? "+" : ""}{match.eloDelta}
                </span>
                <span className="history-time">{relativeTime(match.playedAt)}</span>
              </div>
              {match.archived ? (
                <span className="history-archived-badge">Archived</span>
              ) : (
                <button
                  type="button"
                  className="history-archive-btn"
                  onClick={() => void handleArchive(match.matchId)}
                  disabled={archivingId === match.matchId}
                  aria-label="Archive match"
                >
                  <Archive size={14} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
