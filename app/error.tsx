"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="error-layout">
      <section className="glass-panel error-card">
        <p className="kicker">Error</p>
        <h1>Something went wrong</h1>
        <p>Give it another try. If this keeps happening, it's on us.</p>
        <div className="error-actions">
          <button className="button primary" onClick={reset} type="button">
            Try Again
          </button>
        </div>
      </section>
    </main>
  );
}
