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
  return (
    <main className="page-shell">
      <section className="glass-panel match-shell">
        <p className="kicker">Live Match</p>
        <h1 className="display">Game Room</h1>
        <RealtimeMatch roomCode={code} />
      </section>
    </main>
  );
}
