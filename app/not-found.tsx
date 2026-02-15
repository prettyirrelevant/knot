import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-layout">
      <section className="glass-panel error-card">
        <p className="kicker">404</p>
        <h1>Page not found</h1>
        <p>Whatever you're looking for, it's not here.</p>
        <div className="error-actions">
          <Link className="button primary" href="/">
            Go Home
          </Link>
        </div>
      </section>
    </main>
  );
}
