---
name: audit
description: >-
  A private, local checkup for your Claude Code setup. Use when the user wants
  to audit, scan, or review their config for safety; when they ask what Claude
  can see, touch, access, or read; when they worry about exposed secrets,
  passwords, API keys, .env files, or sensitive files; or when they ask whether
  their setup is safe, locked down, or leaking. Triggers on phrasings like "can
  Claude see my passwords?", "is my setup safe?", "what can Claude access?",
  "check my permissions", "audit my config", "am I exposed?". Runs a local
  offline script that reads the bytes so Claude only ever sees redacted
  findings, then fixes issues one approved step at a time.
argument-hint: "[path to project, defaults to current folder]"
---

# fantasia — audit + fix

A friendly, private checkup for a Claude Code setup. It scores the setup, shows
what is exposed and what Claude can actually reach, explains *how it knows* for
every finding, and fixes issues one approved step at a time.

The detail lives in the shared reference files — consult them as you go:

- **`../../references/checks.md`** — the full check catalog (what each finding id
  means, severity, and the recommended fix). Use it to enrich `why`/`fix` text.
- **`../../references/standards.md`** — "what good looks like," the scoring
  rubric, and the voice/wording guidance. Use it for tone and for grading.

---

## Hard rules (these are non-negotiable — read before doing anything)

1. **Disclose, then wait for consent.** Show the disclosure (Step 1) and STOP.
   Do not run the scanner until the user explicitly says yes.
2. **Operate ONLY on the scanner's redacted JSON.** Everything you report comes
   from that JSON object. You do the reasoning; the script did the reading.
3. **NEVER Read, Grep, `cat`, open, or otherwise inspect a flagged file.** This
   is the whole point of fantasia: the script reads bytes so *you never have to
   look at the secret*. Opening a flagged file pulls the secret into this
   conversation and defeats the entire tool. If you ever feel the urge to "just
   check the file," don't — the JSON already told you everything you may know.
4. **Never echo a secret value.** Only ever show the `redactedMatch` field
   (e.g. `AKIA••••`). Never reconstruct, guess, or quote a real value.
5. **Change nothing without explicit, per-item approval.** No edits during the
   report. Fixes happen one at a time in the fix loop, each gated on a clear yes.
6. **Show your work.** Every finding you surface includes its `evidence` — how
   it was detected — so the user can judge it. No black-box findings.
7. **Be honest when a control isn't airtight**, but ground the caveat in what
   *this* scan found (see Voice, below). Never raise an abstract limitation that
   doesn't apply here.

---

## Step 1 — Disclose and get consent

Open with this (you may adapt the wording to fit the conversation, but keep
every guarantee — offline/local script, reads config + project files, redacts
secret values, will not open file contents into chat, will not change anything
yet, Claude only sees redacted findings, every finding shows how it was
detected, never looks above the project folder):

> **fantasia is about to run a local checkup. Nothing runs until you say go.**
>
> **What runs:** `fantasia-scan`, a small script on your machine. It runs fully
> offline — no network calls, sends nothing anywhere.
>
> **What it reads (locally):** your Claude config (`.claude/settings` files,
> `.mcp.json`, hooks, `CLAUDE.md` / `AGENTS.md`, ignore files, and your
> user-level `~/.claude` settings), and your project files, to look for exposed
> secrets and sensitive data. It skips `node_modules`, `.git`, binaries, and
> anything already ignored.
>
> **What it looks for:** loose security settings (e.g. broad command access, the
> ability to read `.env`); passwords, API keys, and private keys sitting in
> readable files; files with financial / medical / personal information; and
> whether any of that is actually *reachable* by Claude given your settings.
>
> **What it will NOT do:** it will not open your file contents into this chat;
> it will not read the *value* of any password or key (those are redacted —
> you'll see `AKIA••••`, never the real thing); it will not change anything
> (fixes come later, one at a time, only with your OK); it will not look outside
> this project folder and your Claude config.
>
> **The guarantee:** the script reads the bytes. I only ever see *redacted*
> findings, so I never see your secrets. And every finding shows *how* it was
> detected, so you can judge it yourself.
>
> **Run the checkup?**  ·  yes  ·  no  ·  show me the rules first

Then STOP and wait. Handle the response:

- **yes** → go to Step 2.
- **no** → acknowledge plainly, do nothing, offer to run it later. Stop.
- **show me the rules first** → summarize what gets checked from
  `../../references/checks.md` (the dimensions and the kinds of findings, in
  plain English), then ask again. Do not scan until they say yes.

---

## Step 2 — Run the scanner

Run the bundled deterministic scanner and capture its JSON from stdout:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-scan" "$PWD" --json
```

If the user passed a path argument, use that as the scan root instead of `$PWD`.

**Dev fallback:** if `${CLAUDE_PLUGIN_ROOT}` is empty (the plugin was loaded via
`--plugin-dir` and the variable isn't set), run from the plugin directory
instead:

```bash
node bin/fantasia-scan . --json
```

The scanner prints **one** JSON object to stdout and exits `0` on success
regardless of how many findings it found. Parse that object. Its shape:

```jsonc
{
  "fantasiaVersion": "0.1.0",
  "scannedRoot": "/abs/path",
  "access": {
    "filesScanned": 142,
    "bytesScanned": 1048576,
    "contentsReadIntoContext": 0,      // always 0 — proof Claude read nothing
    "skipped": { "node_modules": 1, "binaries": 3, "ignored": 7, "...": 0 },
    "traversedAboveRoot": false
  },
  "configSources": [ /* settings files reconciled, by precedence */ ],
  "summary": {
    "score": 0,                         // 0–100 overall
    "grades": {                         // per-dimension grade (e.g. A–F)
      "exposure": "F", "permissions": "C",
      "privacy": "B", "context": "B", "leverage": "C"
    },
    "counts": { "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0 }
  },
  "findings": [
    {
      "id": "reachable-secret",
      "title": "Live AWS key in a file Claude can read",
      "dimension": "exposure",          // exposure|permissions|privacy|context|leverage
      "severity": "critical",           // critical|high|medium|low|info
      "file": "config/old.js", "line": 14,
      "redactedMatch": "AKIA••••••••••••",
      "evidence": "matched rule `aws-access-key` (regex + entropy 4.3); no Read deny covers this path; Bash broadly allowed",
      "why": "An AWS key here can be read by Claude or anything it runs.",
      "fix": "Move it to an env var; add a Read deny for this path; rotate the key.",
      "reachable": true,                // bool | null
      "autoFixable": true,              // can fantasia apply the config fix itself?
      "fingerprint": "config/old.js:reachable-secret:14"
    }
  ]
}
```

If the command fails to run (non-zero exit, no JSON, malformed JSON): do not
guess and do not fall back to reading files yourself. Report plainly that the
checkup couldn't run, show the error, and suggest the dev-fallback invocation or
checking that Node is available. Never substitute your own file reading for the
scanner.

---

## Step 3 — Render the report

Write the report in plain English for someone who will never use a terminal
(Cowork-friendly). Use the voice rules below. Structure it like this:

### 3a. Score and grades

Lead with the overall **score (0–100)** and the per-dimension grades, grouped
into two buckets so the meaning is obvious:

- **Safety** — `exposure` + `permissions` + `privacy`. (Critical findings hold
  this down until fixed; say so.)
- **Setup quality** — `context` + `leverage`.

Briefly say what the score means in human terms ("solid, a couple of things to
tighten" / "one urgent thing, then you're in good shape"). Pull grading and
phrasing guidance from `../../references/standards.md`.

### 3b. Two access statements (keep these separate and explicit)

**(a) What Claude can reach from here** — a plain blast-radius summary derived
from the `permissions` and `exposure` findings and `configSources`. In one short
paragraph: what kinds of files Claude can currently open, whether broad command
access (`Bash`) is on, what connected tools (MCP) can do, and — crucially —
whether anything *sensitive* sits inside that reach. This is the "boundaries of
the magic" picture.

**(b) What this checkup itself touched** — straight from the `access` block:

> Scanned **{filesScanned}** files under `{scannedRoot}`; **read 0 file contents
> into this conversation**; skipped {skipped, in plain words: node_modules, .git,
> binaries, ignored files}; never looked above the project folder.

Always state the "read 0 file contents into this conversation" line — it's the
proof of the privacy promise.

### 3c. Findings

Group findings by dimension; within each, sort by severity (critical → info).

**Lead with the exposure correlations** — `reachable-secret` and any finding with
`reachable: true`. These are the headline: a secret that Claude can actually
reach is the thing that matters most. Put them first, above everything else.

For each finding, show:

- **Title** — the `title`, in plain language.
- **Why it matters** — the `why`, made concrete for *their* setup. Use
  `reachable` to make it contextual (see Voice).
- **How it was found** — the `evidence`, verbatim-ish, so they can judge it.
- **The fix** — the `fix`, stated as the next step you'll offer in the fix loop.
- Show `redactedMatch` (never a real value) and `file:line` so they know where.

Don't dump the raw JSON. Translate it.

---

## Step 4 — The fix loop

Go one finding at a time, **highest severity first** (and within that, lead with
the `reachable: true` ones). For each:

1. **Restate** the finding briefly: what it is, why it matters here, how it was
   found.
2. **Show the exact change as a preview.** Be concrete:
   - For an `autoFixable` config change, show the precise lines you'd add or
     edit — e.g. the `permissions.deny` entries to add to `.claude/settings.json`,
     or the exact `.claudeignore` you'd create — as a diff or a clearly-labeled
     before/after block. Pull the canonical fix snippets from
     `../../references/checks.md`.
   - For a non-auto-fixable item (`autoFixable: false` — e.g. *rotate a leaked
     key*, *move a file out of the project*, *change a consumer data-training
     setting in your account*), give clear, plain, numbered steps the user does
     themselves. Don't pretend you can do it for them.
3. **Ask for approval.** Apply ONLY after an explicit yes for *this* item.
   - When applying an `autoFixable` config change, use **Edit** (for existing
     files like `.claude/settings.json`) or **Write** (to create a new file like
     `.claudeignore`). Touch only config/ignore files — never the flagged file
     that holds a secret.
   - "Mark this as fine / not a problem" is also a valid choice — note it and
     move on (it can be recorded as a dismissed fingerprint later).
4. **After applying**, confirm what changed in one line, then move to the next
   finding.

When the queue is done (or at any natural stopping point), offer to **re-run the
scanner** to confirm the score moved — re-running Step 2 and re-rendering, so the
user watches "47 → 92."

Honesty about limits (apply per Voice): when you add a `Read` deny rule, say
plainly that it stops *you* from opening that file directly but a script you or
the user runs in the project could still read it — and whether that matters here
depends on whether a real secret is present. If a real exposure is in play, offer
the airtight option (turning on the sandbox via `/sandbox`). If nothing sensitive
is there, say it's not a worry right now — just worth knowing.

---

## Voice (apply this everywhere — it is the point of the skill)

Follow `../../references/standards.md` for the full voice guidance. The essentials:

- **Plain language, no jargon.** Say "a script that you or I run," never
  "subprocess." Say "files Claude can open," not "read scope." Define any term
  you must use. Assume the reader will never `cd` or touch a terminal.
- **First-person-plural and friendly.** "Let's tighten this," "here's what I
  found," "want me to fix it?" Calm, not alarming. Never scare for effect.
- **Ground every caveat in what THIS scan found.** Don't recite abstract risks.
  Tie each one to a real finding, file, or setting from the JSON.
- **Make caveats contextual using `reachable`.** This is the heart of it:
  - When `reachable: true` (a real, reachable secret): *"This matters here
    because that file has a live key in it. A deny rule stops me from opening it,
    but a script we run in this project could still read it — so the airtight fix
    is turning on the sandbox. Want me to set that up?"*
  - When `reachable: false`/`null` (nothing sensitive in reach): *"A deny rule
    stops me from opening that file directly. A script we run could still read
    it — but that's not a concern right now, since there's nothing sensitive
    there. Just worth knowing if that changes."*
- **Never surface a limitation that doesn't apply to their setup.** If it's not
  relevant here, say so plainly or don't raise it.
- **Always offer the next step.** End every section with a clear, low-friction
  choice: fix this one, skip it, see the next, or re-run.
