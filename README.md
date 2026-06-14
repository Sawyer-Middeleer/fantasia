# fantasia 🪄

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-da7756)
![plugin validate](https://img.shields.io/badge/plugin%20validate-passing-3fb950)
![tests](https://img.shields.io/badge/scanner%20tests-41%2F41-3fb950)
![license](https://img.shields.io/badge/license-MIT-blue)

> One day the sorcerer's apprentice got bored of doing his chores.

**A friendly checkup for your Claude Code setup.** fantasia finds exposed
secrets, sensitive files, and loose permission settings — explains every finding
in plain English — and fixes them one approved step at a time. Built for people
early in their journey with Claude Code, especially the non‑technical.

The apprentice didn't flood the room because the magic was weak. He flooded it
because he never understood the *boundaries* of the magic. fantasia is the check
that keeps the brooms in their lane.

---

## What it does

- **🔎 Audit + fix** (`/fantasia-safety-check`) — a private, local scan that scores your
  setup, shows what's exposed and reachable, explains *how it knows*, and fixes
  issues with your approval.
- **🧰 Setup** (`/fantasia-safety-setup`) — a plain‑English interview that generates a
  safe starting config (CLAUDE.md, permission rules, ignore rules).
- **💬 Ask** (`/fantasia-ask`) — the Claude Code docs in plain English, starting
  from the questions real people actually ask, personalized to your setup.

## The privacy promise

fantasia's scan is a **local script** that runs fully offline. It reads the bytes
so Claude doesn't have to — and Claude only ever sees **redacted** findings
(`AKIA••••`, never your real keys). Every finding shows *how it was detected*.
Nothing is sent anywhere, and nothing changes without your say‑so.

## Install (from the marketplace)

```
/plugin marketplace add Sawyer-Middeleer/fantasia
/plugin install fantasia@fantasia
```

## Use it

Installing or loading the plugin is **silent** — nothing runs on its own. You
then invoke one of the three skills:

```
/fantasia-safety-check              # checkup of your current folder
/fantasia-ask what's MCP?    # plain-English answers
/fantasia-safety-setup              # safe first-time setup
```

`/help` lists the three `fantasia-*` skills once it's loaded.

## Try it from a clone (no install)

```bash
# from INSIDE the repo, the plugin dir is "."  (not "./fantasia")
claude --plugin-dir .
```

Then run `/fantasia-safety-check ./test/fixtures` — a deliberately-broken sample
project — to see the scan, the score, and the redaction in action. Edit plugin
files and run `/reload-plugins` to pick up changes; `claude plugin validate .`
checks the structure before release.

> **"Nothing happened"?** Loading is silent — type `/fantasia-safety-check` to start.
> And from inside the repo the path is `.`, not `./fantasia` (which would resolve
> to a folder that doesn't exist).

## Status

All three skills are built and the plugin validates. The deterministic scanner
(secrets · sensitive data · loose settings · reachability correlation) ships with
a 41-assertion test suite. See [plan.md](plan.md) for the full design and
[QUICKSTART.md](QUICKSTART.md) for a 60-second start.

## License

MIT © Sawyer Middeleer
