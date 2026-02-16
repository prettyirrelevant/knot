"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

const GET_LEADERBOARD = api.ratings.getLeaderboard;
const LEADERBOARD_LIMIT = 25;

function SkeletonRows() {
  return (
    <div className="leaderboard-list">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="skeleton skeleton-leaderboard-row" />
      ))}
    </div>
  );
}

export function LeaderboardClient() {
  const leaderboard = useQuery(GET_LEADERBOARD, { limit: LEADERBOARD_LIMIT });
  const entries = leaderboard ?? [];

  if (leaderboard === undefined) {
    return <SkeletonRows />;
  }

  if (!entries.length) {
    return <p className="feedback-line">No ranked players yet. Play some matches to get on the board.</p>;
  }

  return (
    <div className="leaderboard-list">
      {entries.map((entry, index) => (
        <article
          key={String(entry._id)}
          className={`leaderboard-row${
            index === 0 ? " rank-1" : index === 1 ? " rank-2" : index === 2 ? " rank-3" : ""
          }`}
        >
          <span className="leaderboard-rank">{index + 1}</span>
          <span className="leaderboard-name">{entry.playerDisplayName}</span>
          <div className="leaderboard-metrics">
            <span className="leaderboard-metrics-elo">{Math.round(Number(entry.elo ?? 0))} Elo</span>
            <span className="leaderboard-metrics-games">{Number(entry.gamesPlayed ?? 0)} games</span>
          </div>
        </article>
      ))}
      {entries.length >= LEADERBOARD_LIMIT && (
        <p className="leaderboard-cap-hint">Showing top {LEADERBOARD_LIMIT} players</p>
      )}
    </div>
  );
}
