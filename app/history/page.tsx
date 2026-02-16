import { HistoryClient } from "./history-client";

export default function HistoryPage() {
  return (
    <main className="page-shell">
      <section className="glass-panel history-shell">
        <p className="kicker">Match History</p>
        <HistoryClient />
      </section>
    </main>
  );
}
