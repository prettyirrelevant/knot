import { LeaderboardClient } from "./leaderboard-client";

export default function LeaderboardPage() {
  return (
    <main className="page-shell">
      <section className="glass-panel leaderboard-shell">
        <p className="kicker">Rankings</p>
        <LeaderboardClient />
      </section>
    </main>
  );
}
