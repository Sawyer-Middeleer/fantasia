# Fantasia

Data hygiene, measurement, and testing for GTM engineering. Bun monorepo, TypeScript throughout.

## Architecture

- `apps/web` — Next.js 15 static marketing site (Vercel)
- `packages/cli` — CLI tool published as `fantasia-sh` on npm (Commander.js)
- `packages/crm-audit` — CRM data quality audit engine (pure functions, framework-agnostic)
- `packages/crm-fix` — CRM auto-fix engine (merge duplicates, normalize formats)
- `packages/connectors/attio` — Attio CRM API client

## Key patterns

- Audit engine is pure functions: `runAudit(contacts) → AuditResult`. No side effects, no CRM calls inside.
- Attio authenticates via API key (Bearer token). No OAuth.
- Fix operations always preview first, then execute.
- CLI stores credentials in `~/.fantasia/credentials.json`.

## Commands

```bash
bun run dev          # Next.js dev server
bun run build:cli    # Build CLI package
bun run test         # Run all tests
bun run typecheck    # Typecheck all packages
```

## Conventions

- This is a public open-source repo. Never commit secrets, real PII, or API keys.
- Test data in `test-data/` must be synthetic.
