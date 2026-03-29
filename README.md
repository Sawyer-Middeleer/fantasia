# fantasia

A collection of micro apps and tools I'm building to run [Revi Systems](https://www.revi.systems). Open source, experimental, opinionated.

The idea: instead of buying a dozen SaaS tools, build small, focused utilities that do exactly what you need. Each "app" in this monorepo is a self-contained tool that solves a real problem I hit while building a business.

## What's in here

### CRM Audit (`packages/integrations`, `packages/cli`)

The first and most built-out piece. Connects to HubSpot (and Attio), scans your CRM data, and surfaces:

- **Duplicate contacts** — fuzzy matching on name, email domain, company, phone
- **Stale records** — no activity in 90+ days
- **Missing fields** — contacts without email, company, title, or phone
- **Format issues** — inconsistent phone formats, name casing

Outputs a health score (A-F) with per-category breakdowns. The CLI can also preview and execute fixes (merge duplicates, normalize formats).

```bash
npx fantasia audit
npx fantasia fix --execute
```

### Web Dashboard (`apps/web`)

Next.js app with a landing page, OAuth flows for HubSpot/Attio, and API routes that wrap the audit engine. Convex backend for persistence.

### Auth, Billing, Backend (`packages/auth`, `packages/billing`, `packages/backend`)

Shared infrastructure — password hashing, session tokens, Stripe integration, Convex schema. These will be reused across future micro apps.

## Tech stack

- **Runtime**: Bun
- **Monorepo**: Bun workspaces
- **Web**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Convex
- **CLI**: Commander.js
- **Billing**: Stripe
- **Language**: TypeScript

## Getting started

```bash
# Install dependencies
bun install

# Run the web app
bun run dev

# Run the Convex backend
bun run dev:convex

# Build the CLI
bun run build:cli
```

Copy `.env.example` to `.env.local` and fill in your keys.

## Project structure

```
apps/
  web/              → Next.js dashboard + API routes
packages/
  cli/              → CLI tool (npx fantasia)
  integrations/     → Audit engine, fix engine, HubSpot client
  backend/          → Convex schema + functions
  auth/             → Password hashing, sessions
  billing/          → Stripe plans + webhooks
```

## License

MIT
