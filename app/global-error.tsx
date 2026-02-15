"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="error-layout">
          <section className="glass-panel error-card">
            <p className="kicker">Error</p>
            <h1>Something went wrong</h1>
            <p>
              {error.message ||
                "Knot ran into a problem. Try refreshing."}
            </p>
            <div className="error-actions">
              <button className="button primary" onClick={reset} type="button">
                Retry
              </button>
              <Link className="button" href="/">
                Home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
