import { HomeActions } from "./home-actions";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="home-hero">
        <article className="glass-panel hero-copy">
          <p className="kicker">1v1 strategy</p>
          <h1 className="display">Knot</h1>
          <p>Create a room, share the code, and play in real time.</p>
          <HomeActions />
        </article>
      </section>

      <section className="surface-grid" aria-label="Architecture scaffold">
        <article className="glass-panel surface-card">
          <p className="kicker">Flexible</p>
          <h2>Your rules, your board.</h2>
          <p>
            Pick a board size, set the win condition, choose your symbols. Every room
            plays by the rules you decide.
          </p>
        </article>
        <article className="glass-panel surface-card">
          <p className="kicker">Instant</p>
          <h2>Every move, in sync.</h2>
          <p>
            Moves land instantly. Timers stay honest. Both players always see the same
            board.
          </p>
        </article>
        <article className="glass-panel surface-card">
          <p className="kicker">Competitive</p>
          <h2>Climb the ladder.</h2>
          <p>
            Every match updates your ranking. Track your record against any rival to
            see who really has the edge.
          </p>
        </article>
      </section>
    </main>
  );
}
