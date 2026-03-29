# fantasia

A collection of micro apps and tools I'm building to run real businesses. Open source, experimental, opinionated.

The idea: instead of buying a dozen SaaS tools, build small, focused utilities that do exactly what you need. Each "app" in this monorepo is a self-contained tool.

## What's in here

### CRM Audit (`packages/integrations`, `packages/cli`)

The first and most built-out piece. Connects to Attio, scans your CRM data, and surfaces:

- **Duplicate contacts** — fuzzy matching on name, email domain, company, phone
- **Stale records** — no activity in 90+ days
- **Missing fields** — contacts without email, company, title, or phone
- **Format issues** — inconsistent phone formats, name casing

Outputs a health score (A-F) with per-category breakdowns. The CLI can also preview and execute fixes (merge duplicates, normalize formats).

```bash
npx fantasia-sh login
npx fantasia-sh audit
npx fantasia-sh fix --execute
```

### Web Dashboard (`apps/web`)

Next.js static marketing site with a landing page.

## Tech stack

- **Runtime**: Bun
- **Monorepo**: Bun workspaces
- **Web**: Next.js 15, React 19, Tailwind CSS
- **CLI**: Commander.js
- **CRM**: Attio (API key auth)
- **Language**: TypeScript

## Getting started

```bash
# Install dependencies
bun install

# Run the web app
bun run dev

# Build the CLI
bun run build:cli
```

## Project structure

```
apps/
  web/              → Next.js marketing site
packages/
  cli/              → CLI tool (npx fantasia-sh)
  integrations/     → Audit engine, fix engine, Attio client
```

## License

MIT
