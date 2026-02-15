# Knot

Knot is a modern 1v1 online strategy game built with Next.js, Convex, and Zustand.

## Stack

- Next.js App Router + TypeScript
- Convex (realtime backend)
- Zustand (UI/session state)

## Quick Start

```bash
pnpm install
pnpm dev
```

## Validate

```bash
pnpm typecheck
pnpm test
```

## Convex Setup

1. Create a Convex project and copy the deployment URL into `.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=...
```

2. Start Convex dev:

```bash
pnpm convex:dev
```
