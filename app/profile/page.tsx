import { ProfileClient } from "./profile-client";

export default function ProfilePage() {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="page-shell">
      {hasConvexUrl ? (
        <ProfileClient />
      ) : (
        <section className="glass-panel profile-shell">
          <p className="kicker">Profile</p>
          <h1 className="display">Your Profile</h1>
          <p className="feedback-line">Set NEXT_PUBLIC_CONVEX_URL to load live player analytics.</p>
        </section>
      )}
    </main>
  );
}
