# fantasia — 60-second start

fantasia is a friendly checkup for your Claude Code setup. It finds exposed
secrets, sensitive files, and loose permissions, explains them in plain English,
and fixes them with your approval.

## 1. Get the plugin

**Option A — install from the marketplace** (persists across sessions):

```
/plugin marketplace add Sawyer-Middeleer/fantasia
/plugin install fantasia@fantasia
```

**Option B — run from a clone** (no install, good for trying it):

```bash
git clone https://github.com/Sawyer-Middeleer/fantasia
cd fantasia
claude --plugin-dir .        # NOTE: "." because you're inside the repo
```

## 2. Run a skill

Loading the plugin is **silent** — it just makes three skills available. Type one
to actually do something:

| You type | What happens |
| --- | --- |
| `/fantasia:audit` | Scans the current folder, scores it, and walks you through fixes one at a time. |
| `/fantasia:audit ./test/fixtures` | Same, on a deliberately-broken sample — the fastest way to see it work. |
| `/fantasia:ask what's MCP?` | A plain-English answer, no jargon. |
| `/fantasia:setup` | A short interview that sets up a new project safely. |

`/help` lists the three skills under the `fantasia:` namespace once it's loaded.

## 3. What to expect from an audit

1. **A disclosure first.** fantasia tells you exactly what it will and won't do,
   and waits for your "yes." Its scan is a local, offline script.
2. **A score and a plain-English report.** It shows what's exposed, what Claude
   can reach, and *how it knows* each finding.
3. **Fixes, one at a time.** Nothing changes without your approval. Your actual
   passwords and keys are never shown — only redacted (`AKIA••••`).

## Troubleshooting

- **"I started Claude with `--plugin-dir` and nothing happened."** That's normal —
  loading is silent. Type `/fantasia:audit` to begin.
- **"`/fantasia:audit` isn't found."** The plugin didn't load. From *inside* the
  repo the path is `.` (not `./fantasia`). Check with `/plugin`, and `/help` for
  the skill list. You may need a recent Claude Code version for `/plugin` and
  `--plugin-dir`.
- **Made an edit and don't see it?** Run `/reload-plugins`.

See [README.md](README.md) for the overview and [plan.md](plan.md) for the design.
