# fantasia 🪄

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

- **🔎 Audit + fix** (`/fantasia:audit`) — a private, local scan that scores your
  setup, shows what's exposed and reachable, explains *how it knows*, and fixes
  issues with your approval.
- **🧰 Setup** (`/fantasia:setup`) — a plain‑English interview that generates a
  safe starting config (CLAUDE.md, permission rules, ignore rules).
- **💬 Ask** (`/fantasia:ask`) — the Claude Code docs in plain English, starting
  from the questions real people actually ask, personalized to your setup.

## The privacy promise

fantasia's scan is a **local script** that runs fully offline. It reads the bytes
so Claude doesn't have to — and Claude only ever sees **redacted** findings
(`AKIA••••`, never your real keys). Every finding shows *how it was detected*.
Nothing is sent anywhere, and nothing changes without your say‑so.

## Install

```
/plugin marketplace add Sawyer-Middeleer/fantasia
/plugin install fantasia@fantasia
```

Then run:

```
/fantasia:audit
```

## Develop

```bash
claude --plugin-dir ./fantasia      # load locally
/reload-plugins                     # pick up changes
claude plugin validate              # validate before release
```

## Status

Early. The audit core (the deterministic scanner + the audit/fix loop) is the
first milestone. See [plan.md](plan.md) for the full design.

## License

MIT © Sawyer Middeleer
