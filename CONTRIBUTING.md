# Contributing to fantasia

The most valuable contributions are **new checks, rules, and plain-English
answers** — and you can add most of those without writing code. fantasia is
designed so the community owns the knowledge, not just the maintainers.

## The contribution surface

| Want to… | Edit | Notes |
| --- | --- | --- |
| Catch a new kind of secret | [`references/rules/secrets.json`](references/rules/secrets.json) | gitleaks-style: `id`, `description`, JavaScript-compatible `regex`, optional `entropy`, `keywords`. |
| Flag a new kind of sensitive data | [`references/rules/sensitive.json`](references/rules/sensitive.json) | financial / medical / legal-pii: `keywords`, `patterns` (JS regex), `filenameGlobs`. |
| Add a settings/permissions check | [`references/rules/settings-checks.json`](references/rules/settings-checks.json) | declarative: `id`, `dimension`, `severity`, detection hint, `fix`. |
| Improve a finding's wording or fix | [`references/checks.md`](references/checks.md) | the human-readable catalog. |
| Answer a beginner question better | [`references/concerns.md`](references/concerns.md) and [`references/docs/`](references/docs/) | real phrasings → plain answers, grounded in the official docs. |

Add a check once and all three skills benefit: **audit** flags it, **setup**
prevents it, **ask** explains it.

## The two rules that can't bend

1. **The privacy invariant.** The scanner reads file bytes; Claude only ever sees
   **redacted** findings. Never emit a raw secret value — `redactedMatch` only.
   Any new code must keep the final redaction safety pass intact.
2. **Honest, contextual voice.** Plain language, grounded in what the scan
   actually found, and clear about whether a caveat *matters right now*. See
   [`references/standards.md`](references/standards.md) §4.

## Working on the scanner

```bash
node test/run.mjs                              # the smoke suite (must stay green)
node bin/fantasia-scan test/fixtures --json --no-user-config   # see raw output
claude plugin validate .                       # structure check
```

The scanner is **zero-dependency Node** and must stay cross-platform (Windows,
macOS, Linux) — Node built-ins only, no `npm install`. If you add a rule, add a
fixture and an assertion to `test/run.mjs` that proves it fires **and** that the
secret stays redacted.

## Pull requests

Branch, keep changes focused, run the smoke suite and `plugin validate`, and
describe what a user would see differently. Thank you for helping keep the
brooms in their lane. 🪄
