import type { Metadata } from "next";

import { RealtimeMatch } from "./realtime-match";

type MatchPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export const metadata: Metadata = {
  title: "Knot Match",
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { code } = await params;
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <main className="page-shell">
      <section className="glass-panel match-shell">
        <p className="kicker">Live Match</p>
        <h1 className="display">Game Room</h1>
        {hasConvexUrl ? (
          <RealtimeMatch roomCode={code} />
        ) : isDevelopment ? (
          <p className="feedback-line">
            Realtime mode requires Convex. Set <code>NEXT_PUBLIC_CONVEX_URL</code> and run{" "}
            <code>pnpm convex:dev</code>.
          </p>
        ) : (
          <p className="feedback-line">Can't reach the game server right now. Try again in a moment.</p>
        )}
      </section>
    </main>
  );
}
