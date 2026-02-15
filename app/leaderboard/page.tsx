import { LeaderboardClient } from "./leaderboard-client";

export default function LeaderboardPage() {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="page-shell">
      <section className="glass-panel leaderboard-shell">
        <p className="kicker">Rankings</p>
        {hasConvexUrl ? (
          <LeaderboardClient />
        ) : (
          <p className="feedback-line">Set NEXT_PUBLIC_CONVEX_URL to load live Elo standings.</p>
        )}
      </section>
    </main>
  );
}
