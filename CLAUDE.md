# Fantasia

Collection of micro apps for running a business. Bun monorepo, TypeScript throughout.

## Architecture

- `apps/web` — Next.js 15 dashboard + API routes (Vercel)
- `packages/cli` — CLI tool published as `fantasia` on npm (Commander.js)
- `packages/integrations` — Core audit/fix engine + HubSpot/Attio clients (framework-agnostic)
- `packages/backend` — Convex functions + schema (serverless DB)
- `packages/auth` — Password hashing (bcrypt) + JWT sessions
- `packages/billing` — Stripe plans + webhook handling

## Key patterns

- Audit engine is pure functions: `runAudit(contacts) → AuditResult`. No side effects, no CRM calls inside.
- HubSpot client handles OAuth refresh automatically (5-min buffer before expiry).
- Fix operations always preview first, then execute. Snapshots stored for 30-day undo.
- API routes use Convex session tokens (httpOnly cookies). Rate limiting is in-memory.
- CLI stores credentials in `~/.fantasia/credentials.json`.

## Commands

```bash
bun run dev          # Next.js dev server
bun run dev:convex   # Convex dev backend
bun run build:cli    # Build CLI package
bun run test         # Run all tests
bun run typecheck    # Typecheck all packages
```

## Conventions

- This is a public open-source repo. Never commit secrets, real PII, or API keys.
- Test data in `test-data/` must be synthetic.
