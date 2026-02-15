Knot
====

Knot is a modern 1v1 online strategy game built with Next.js, Convex, and Zustand.

Stack
-----
- Next.js App Router + TypeScript
- Convex (realtime backend)
- Zustand (UI/session state)

Quick Start
-----------
  pnpm install
  pnpm dev

Validate
--------
  pnpm typecheck
  pnpm test

Environment Variables
---------------------
Create a `.env.local` file with the following:

  NEXT_PUBLIC_CONVEX_URL=...
  KNOT_SESSION_SECRET=...

KNOT_SESSION_SECRET is required for signing session cookies.
Use a random string of at least 32 characters.

Convex Setup
------------
1. Create a Convex project and copy the deployment URL into `.env.local`.
2. Start Convex dev:

  pnpm convex:dev
