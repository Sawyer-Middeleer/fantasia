---
name: fantasia-safety-check
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
every finding, and fixes issues one approved step at a time. It can save a
plain-English `FANTASIA-REPORT.md`, dismiss false positives, and accept a baseline
so re-runs only surface what's new.

**The flow, end to end:** disclose & consent (Step 1) → run the scanner (Step 2) →
add the judgment findings the scanner can't (Step 2.5) → render the report
(Step 3) → fix loop (Step 4) → dismiss / baseline for clean re-runs (Step 5) →
save the checkup as a visual page and/or written summary (Step 6).

The detail lives in the shared reference files — consult them as you go:

- **`../../references/checks.md`** — the full check catalog (what each finding id
  means, severity, and the recommended fix). Use it to enrich `why`/`fix` text.
- **`../../references/standards.md`** — "what good looks like," the scoring
  rubric, and the voice/wording guidance. Use it for tone and for grading.

---

## Hard rules (these are non-negotiable — read before doing anything)

1. **Disclose, then wait for consent.** Show the disclosure (Step 1) and STOP.
   Do not run the scanner until the user explicitly says yes — and collect that
   yes through the **AskUserQuestion** tool, not a free-text question (see rule 8).
2. **Operate ONLY on the scanner's redacted JSON.** Everything you report comes
   from that JSON object. You do the reasoning; the script did the reading.
3. **NEVER Read, Grep, `cat`, open, or otherwise inspect a flagged file.** This
   is the whole point of fantasia: the script reads bytes so *you never have to
   look at the secret*. Opening a flagged file pulls the secret into this
   conversation and defeats the entire tool. If you ever feel the urge to "just
   check the file," don't — the JSON already told you everything you may know.
4. **Never echo a secret value** — in chat *or* in any file you write
   (`FANTASIA-REPORT.md`, `.fantasiaignore`). Only ever show the `redactedMatch`
   field (e.g. `AKIA••••`). The `.fantasiaignore` fingerprint (`path:rule:line`)
   is safe; a secret value is never. Never reconstruct, guess, or quote a real
   value anywhere.
5. **Change nothing without explicit, per-item approval.** No edits during the
   report. Fixes happen one at a time in the fix loop, each gated on a clear yes
   collected through the **AskUserQuestion** tool (see rule 8).
6. **Show your work.** Every finding you surface includes its `evidence` — how
   it was detected — so the user can judge it. No black-box findings.
7. **Be honest when a control isn't airtight**, but ground the caveat in what
   *this* scan found (see Voice, below). Never raise an abstract limitation that
   doesn't apply here.
8. **Use the AskUserQuestion tool at every decision gate.** The user's choices —
   consent to scan (Step 1), each fix decision (Step 4), each dismissal (5a), the
   baseline offer (5b), and the report offer (Step 6) — must be presented as
   structured options via the **AskUserQuestion** tool, *never* as a prose
   question you then wait on. Posing these in plain text is what makes the
   checkup stall or quietly slide past a decision. The *only* things you ask in
   ordinary conversation are genuinely open-ended prompts (e.g. "what in here is
   sensitive to you?"). Everything with a fixed set of answers goes through the
   tool.

---

## Step 1 — Disclose and get consent

Open with this (you may adapt the wording to fit the conversation, but keep
every point — offline/local script, reads config + project files, redacts
secret values, will not open file contents into chat, will not change anything
yet, Claude only sees redacted findings, every finding shows how it was
detected, never looks above the project folder):

> **I'd like to run a quick safety check on this project — nothing happens until
> you say go.**
>
> **How it works:** a small checker runs right here on your computer. It stays on
> your machine and doesn't send anything anywhere.
>
> **What it looks at:** your Claude setup and the files in this project, to find
> three kinds of thing — settings that give Claude more freedom than you might
> want, any passwords or keys sitting in plain files, and any documents with
> personal, financial, or medical information. It also checks whether Claude could
> actually reach any of that.
>
> **What it won't do:** it won't show me what's inside your files, and it won't
> reveal any real password or key — those get masked, so I'd see something like
> `AKIA••••` instead of the real value. It won't change anything; any fixes come
> later, one at a time, and only if you say yes. And it never looks anywhere
> outside this project and your Claude setup.
>
> **In plain terms:** the checker reads your files so I don't have to — I only
> ever see the masked results, not your actual secrets. And for everything it
> finds, I'll show you how it knew, so you can decide for yourself.

Then get consent through the **AskUserQuestion** tool — do **not** pose this as a
plain-text question and wait. Call it with:

- **header:** `Run checkup`
- **question:** "Ready to run the local checkup on `<folder>`?"
- **options:**
  - **Run the checkup** — "Run the offline scan now. Nothing changes; I only show you what I find."
  - **Not right now** — "Don't scan. We can do this anytime."
  - **Show me the rules first** — "See exactly what gets checked before running."

Handle the choice:

- **Run the checkup** → go to Step 2.
- **Not right now** → acknowledge plainly, do nothing, offer to run it later. Stop.
- **Show me the rules first** → summarize what gets checked from
  `../../references/checks.md` (the dimensions and kinds of findings, in plain
  English), then ask again with the **same tool** (just **Run the checkup** /
  **Not right now**). Do not scan until they choose to run it.

---

## Step 2 — Run the scanner

Run the bundled deterministic scanner and capture its JSON from stdout:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-scan" "$PWD" --json
```

If the user passed a path argument, use that as the scan root instead of `$PWD`.

**Always honor dismissals and baselines.** Before running, check whether the user
has dismissed any findings or accepted a baseline (these are produced by the
flows in Step 5):

- The scanner reads `$PWD/.fantasiaignore` automatically. You don't have to pass
  it — but you may pass it explicitly for clarity:
  `--ignore-file "$PWD/.fantasiaignore"`.
- If `$PWD/.fantasia/baseline.json` **exists**, pass
  `--baseline "$PWD/.fantasia/baseline.json"` so the scanner marks which findings
  are new since the baseline was accepted.

So the full invocation, when a baseline is present, is:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-scan" "$PWD" --json \
  --baseline "$PWD/.fantasia/baseline.json"
```

Use a quick `test -f "$PWD/.fantasia/baseline.json"` to decide whether to add the
`--baseline` flag (or just `ls` the path). Don't pass `--baseline` if the file
isn't there — the scanner treats a missing baseline as "everything is new," which
is wrong for a first run.

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
    "score": 0,                         // 0–100 overall (excludes ignored findings)
    "grades": {                         // per-dimension grade (e.g. A–F)
      "exposure": "F", "permissions": "C",
      "privacy": "B", "context": "B", "leverage": "A"
    },
    "counts": { "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0 },
    "ignoredCount": 0,                  // how many findings are dismissed via .fantasiaignore
    "newCount": null                    // int when a baseline was passed; null otherwise
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
      "ignored": false,                 // true if dismissed via .fantasiaignore (already excluded from counts/score/grades)
      "isNew": true,                    // true|false when a baseline was passed; null otherwise
      "fingerprint": "config/old.js:reachable-secret:14"
    }
  ]
}
```

**Two new fields drive the M2 report shape:**

- **`ignored`** — when `true`, the user previously dismissed this finding
  (see the dismiss flow in Step 5). The scanner already excludes ignored findings
  from `counts`, `score`, and `grades`. Do **not** put them in the main findings
  list. List them only under a small "Previously dismissed" note (Step 3d).
- **`isNew`** — only meaningful when you passed `--baseline`. `true` = surfaced
  since the baseline was accepted; `false` = already present and reviewed when the
  baseline was snapshotted; `null` = no baseline was in play. When a baseline
  exists, lead the report with the `isNew: true` findings and clearly mark the
  rest as already reviewed (Step 3 and Step 5).

> **A note on leverage.** The scanner always grades `leverage` as `"A"` — it does
> the deterministic checks and structurally **cannot** assess leverage. You
> recompute the leverage grade yourself in the judgment pass (Step 2.5). Treat the
> scanner's leverage grade as a placeholder, not a result.

If the command fails to run (non-zero exit, no JSON, malformed JSON): do not
guess and do not fall back to reading files yourself. Report plainly that the
checkup couldn't run, show the error, and suggest the dev-fallback invocation or
checking that Node is available. Never substitute your own file reading for the
scanner.

---

## Step 2.5 — The judgment pass (add what the scanner structurally can't)

The scanner only does deterministic checks. Two kinds of finding are inherently
judgment calls — the scanner can't produce them, so **you** add them here, after
parsing the JSON and before rendering the report. Mark each one you add as a
`[judgment]` finding so the report can flag it as your assessment, not a
deterministic rule (per "Show your work" in the standards).

Stay inside the hard rules while doing this. You still **never open a flagged
file**. You reason only from: the scanner JSON (`configSources`, `findings`,
`access`), the directory listing you can already see, and what the user tells
you. If you can't ground a judgment finding in one of those, don't raise it.

Keep this lightweight. Only add a finding when their actual setup warrants it —
never pad the report with generic advice.

### 2.5a — `consumer-training-on` (dimension `privacy`, severity `info`)

You **cannot reliably read the user's plan tier**, so do not fabricate a
determination. Handle it honestly — frame it conditionally, or ask:

> "One privacy note I can't check for you automatically — it depends on your plan:
> if you're on a **Free, Pro, or Max** plan, your conversations and code may be
> used to improve Anthropic's models, with about a 5-year retention window. If
> you're on a Team or Enterprise plan, that's off by default. Worth a look either
> way — you can review it at `claude.ai/settings/data-privacy-controls`."

Never assert "your data is being used for training" as fact. If the user
volunteers their plan, you can sharpen the wording, but the default is the
conditional framing above. See `consumer-training-on` in
`../../references/checks.md` for the underlying detail.

### 2.5b — Leverage findings (dimension `leverage`, severity `info`)

The scanner always grades `leverage` `"A"` as a placeholder. The three leverage
checks (`repeated-prompt`, `unused-capability`, `ready-for-structure`) are all
`[judgment]`. Assess each from the evidence you actually have — only raise the
ones that genuinely apply:

- **`unused-capability`** — infer from `configSources` and the findings whether
  there are any skills, subagents, or memory patterns in use. The strongest
  honest signal you have: is there a `CLAUDE.md` at all (a `no-claude-md` finding
  means there isn't), and does the config inventory show any skills/agents/MCP?
  If the project is clearly running on the bare chat interface, surface the single
  most applicable next capability — not a list.
- **`repeated-prompt`** — only if you have real evidence (e.g. the same long
  instruction repeated in `CLAUDE.md`, or the user has pasted the same prompt in
  this conversation). If you have no such evidence, don't raise it.
- **`ready-for-structure`** — only if `access.filesScanned` and the config
  picture genuinely suggest a project complex enough to benefit from a STATUS.md
  / routing pattern. Offer the smallest next step, not a full system.

See section F of `../../references/checks.md` for the framing of each.

### 2.5c — Recompute the leverage grade yourself

Because the scanner's leverage grade is a placeholder, you own that dimension's
grade and its contribution to the overall picture:

1. Start from "A" (nothing to improve) and step the grade down for each leverage
   finding you actually raised, weighted by how clearly it applies — e.g. an
   obvious `unused-capability` on a bare-chat project pulls leverage to a B or C;
   a fully-equipped project with skills, a clean `CLAUDE.md`, and sensible
   structure stays at A with no findings.
2. Follow the grading bands in `../../references/standards.md` so leverage is
   graded on the same curve as the script dimensions.
3. In the report, **clearly note that the leverage grade is your assessment**,
   not the scanner's — e.g. "Leverage (my read, not the scanner's): B." The
   Safety dimensions (exposure / permissions / privacy) keep the scanner's grades
   untouched; only leverage is re-graded by you.

This does not change the scanner's numeric `score` field — present the overall
score as the scanner reported it, and call out the leverage grade as the one
human-assessed dimension layered on top.

---

## Step 3 — Render the report

Write the report in plain English for someone who will never use a terminal
(Cowork-friendly). Use the voice rules below. Structure it like this:

### 3a. Open with a plain headline, then the score

Before any numbers, give **one plain sentence** that says where they stand and
what (if anything) needs doing — e.g. *"Your setup's in good shape: one thing
worth fixing and a couple of small notes,"* or *"One urgent thing here — an
exposed key Claude can reach — then you're in good shape."* That sentence is what
a non-technical reader actually needs, so lead with it.

Then the overall **score (0–100)** as a quick gut-check with a human gloss. The
per-dimension letter grades (`exposure`, `permissions`, `context`, …) are useful
but abstract — keep them **brief and secondary** (a compact line, or an offer:
"want the dimension-by-dimension breakdown?"), never the headline. Two things to
keep accurate when you do show them: critical findings hold the score down until
fixed (say so), and the `leverage` grade is your own read from Step 2.5c, not the
scanner's. Pull phrasing guidance from `../../references/standards.md`.

**If a baseline was in play** (you passed `--baseline` and `summary.newCount` is
not `null`): open with what's *new*. Say plainly, e.g. "Since you accepted the
last checkup, **{newCount} new things** have come up — those are what I'll focus
on. Everything else was already reviewed and accepted." This is the
score-over-time UX; the new items are the headline.

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
concrete proof that nothing was read into this chat.

### 3c. Findings

Work only from findings where `ignored` is `false` (the dismissed ones go in 3d,
never here). Group the rest by dimension; within each, sort by severity
(critical → info). Fold in the `[judgment]` findings you added in Step 2.5 — put
them in their dimension (`consumer-training-on` under privacy, the leverage
findings under leverage) and label them as your assessment, not a scanner rule.

**Ordering, in priority order:**

1. **If a baseline is in play, the `isNew: true` findings come first**, grouped as
   "New since you last accepted this." Within that, still lead with reachable
   exposures. Then show the previously-accepted findings under a clearly-marked
   "Already reviewed (accepted last time)" heading so they're visibly secondary.
2. **Lead with the exposure correlations** — `reachable-secret` and any finding
   with `reachable: true`. These are the headline: a secret that Claude can
   actually reach is the thing that matters most. Put them first within their
   group.

**Presentation by severity — de-noise the minor stuff.** Give *critical* and
*high* findings the full treatment (what it is, why it matters here, how it was
found, the fix). But **collapse everything *medium* and below into a single
compact list** — "A few minor things worth knowing" — one calm plain line each
(what it is + half a sentence of why), no heavy blocks and no evidence/fix walls.
These are "good to know," not "do this now." Offer to expand any of them ("want me
to walk through any of these?"). A benign, visible hook or a convenience allow
rule belongs here as one relaxed line — never a scary block.

**Per-file dedup (required).** The scanner emits **one `reachable-secret` (and
one underlying secret finding) per secret**, so a single `.env` with five keys
becomes five near-identical findings. **Collapse them.** Group secret/reachable
findings by `file`, and render **one headline per file** that lists the affected
line numbers and the count — so the user sees:

> **`.env` — 5 exposed secrets, all reachable** (lines 3, 7, 8, 12, 14)
> Each is a credential Claude can currently read… *(one why / evidence / fix
> block for the file, not five)*

Not five near-identical blocks. List the per-line `redactedMatch` values compactly
under the headline if useful (e.g. `line 3: AKIA••••`, `line 7: sk-••••`), but
keep it to one finding block per file. Preserve every distinct `fingerprint`
internally — you'll need them all for the dismiss flow and the "Still open" list.

For each finding (or each per-file group), show:

- **Title** — the `title`, in plain language. For a deduped group, the file-level
  headline above.
- **Why it matters** — the `why`, made concrete for *their* setup. Use
  `reachable` to make it contextual (see Voice).
- **How it was found** — the `evidence`, verbatim-ish, so they can judge it. For a
  `[judgment]` finding, say it's your assessment, not a deterministic rule.
- **The fix** — the `fix`, stated as the next step you'll offer in the fix loop.
- Show `redactedMatch` (never a real value) and `file:line` so they know where.

Don't dump the raw JSON. Translate it.

### 3d. Previously dismissed (only if any)

If `summary.ignoredCount > 0`, add a small note at the **end** of the findings,
not woven into them:

> **Previously dismissed ({ignoredCount}).** You marked these as fine in a past
> checkup, so they're not counted in your score: ⟨list the ids + files in one
> compact line each⟩. Say the word if you want to un-dismiss any of them.

These come from `findings[]` entries where `ignored: true`. Never surface them in
the main list, and never re-raise them as if new.

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
3. **Ask for approval with the AskUserQuestion tool** — never a prose yes/no.
   Present *this* finding's decision as structured options:
   - **header:** `Fix it?` · **question:** the finding's plain-language title.
   - **options for an `autoFixable` item:** **Apply the fix** ("⟨the concrete
     change in a few words⟩") · **Skip for now** ("Leave it; I'll list it as
     still open.") · **Mark as fine** ("It's a false positive — stop flagging
     it.") · **Stop the checkup** ("Pause here and summarize.").
   - **options for a non-`autoFixable` item** (the steps are the user's to do, so
     there's no "Apply"): **Got it, I'll do that** · **Skip for now** · **Mark as
     fine** · **Stop the checkup**.

   Then act on the choice — apply ONLY after the explicit choice for *this* item:
   - **Apply the fix** → apply now. Use **Edit** (existing files like
     `.claude/settings.json`) or **Write** (a new file like `.claudeignore`).
     Touch only config/ignore files — never the flagged file that holds a secret.
   - **Mark as fine** → the **dismiss flow** (Step 5a): confirm it's a genuine
     false positive, then record the `fingerprint` in `.fantasiaignore`.
   - **Skip for now** / **Got it, I'll do that** → leave it open and note it for
     the report's "Still open" list.
   - **Stop the checkup** → end the loop and go to the summary / report (Step 6).
4. **After applying**, confirm what changed in one line, then move to the next
   finding. Track which findings you fixed this session and which the user left
   open — you'll need both lists for the report (Step 6).

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

## Step 5 — Dismiss and baseline (re-run hygiene)

These two flows make re-runs useful: dismissing false positives, and accepting a
known state so future checkups only surface what's new. Both **change files at the
project root**, so both follow the same disclose-then-consent discipline as every
other change — describe what you'll write, and apply only on an explicit yes.

### 5a. Dismiss a finding ("mark as fine")

When the user judges a finding to be a false positive and wants it gone from
future checkups, append its `fingerprint` to `.fantasiaignore` at the project
root — **only after they explicitly approve.** Each dismissal is two lines:

1. A leading comment line: `# <id> on <file> — dismissed: <short reason>`
2. The bare `fingerprint` on its own line.

For example, dismissing a finding the user says is a sample/test key:

```
# secret-in-readable-file on fixtures/sample.env — dismissed: test fixture, not a real key
fixtures/sample.env:secret-in-readable-file:3
```

Use **Edit** to append if `.fantasiaignore` already exists; **Write** to create
it if it doesn't (read it first if it exists, so you append rather than clobber).
One fingerprint per line; never write a secret value into it — the fingerprint is
`path:rule:line`, which is safe. After writing, tell the user plainly: "Done —
future checkups will skip this automatically. You can delete that line from
`.fantasiaignore` anytime to bring it back." (The scanner reads `.fantasiaignore`
on every run, so the next scan will report it as `ignored: true` and drop it from
the score.)

Only dismiss what the user explicitly approves, one finding at a time. Never
dismiss a `reachable: true` exposure on the user's behalf or talk them into it —
dismissing is for genuine false positives.

### 5b. Baseline ("accept the current state")

When the user wants to stop seeing the findings they've decided to live with for
now — so future checkups surface only *new* issues — offer to snapshot the
current state. First say what it does and where it writes:

> "I can take a snapshot of everything as it stands right now and save it to
> `.fantasia/baseline.json`. After that, every checkup will lead with anything
> **new** since today and quietly mark the rest as already-reviewed — so you see
> movement, not the same list every time. Nothing about your actual files
> changes; it's just a record of what we've already looked at."

Then ask with the **AskUserQuestion** tool (header `Baseline`): **Accept current
state** ("Snapshot today's findings; future checkups show only what's new.") ·
**Not now** ("Keep showing everything each time."). On **Accept current state**,
snapshot by re-running the scanner with `--write-baseline`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-scan" "$PWD" --json \
  --write-baseline "$PWD/.fantasia/baseline.json"
```

(Use the dev-fallback invocation if `${CLAUDE_PLUGIN_ROOT}` is unset, same as
Step 2.) The scanner writes the baseline file itself — you don't hand-write it.
Confirm in one line where it was saved.

From then on, **every** audit run picks the baseline up automatically via the
`--baseline` flag in Step 2 (because `$PWD/.fantasia/baseline.json` now exists),
and the report leads with `isNew: true` findings per Step 3a/3c.

Baselining is best offered *after* the fix loop — once the user has fixed what
they want to fix, accepting the remainder is a clean stopping point.

---

## Step 6 — Save the checkup (a visual page, a written summary, or both)

At the end of an audit, offer to save a copy to the project root. There are two
formats, and the user can take either or both:

- **A visual page** (`FANTASIA-REPORT.html`) — a single self-contained page they
  open in a browser: a warm map of what Claude can actually reach, the score, the
  five grades, and the findings. Best for seeing the picture at a glance, and the
  easiest thing to share or keep.
- **A written summary** (`FANTASIA-REPORT.md`) — the same checkup in plain English.
  Best for skimming in an editor or pasting into notes.

Both **create a new file**, so disclose first (the disclose-before-acting rule)
with a one-line heads-up, then write only on a yes:

> "I can save a copy of this checkup at your project root — either a visual page
> you open in your browser, a plain-English written summary, or both. No secret
> values either way; just the masked findings."

Then ask with the **AskUserQuestion** tool (header `Save report`):
**A visual page** · **A written summary** · **Both** · **No thanks**. On
**No thanks**, skip it. Otherwise produce the chosen format(s) as below.

### 6a. The visual page (`FANTASIA-REPORT.html`)

Render the page from the **same assessment as the written summary** — it must
include the `[judgment]` findings you added in Step 2.5 and the leverage grade you
recomputed in 2.5c, not the scanner's placeholder `A`. So unless you added no
judgment at all, render from an augmented copy of the scan rather than the raw pipe:

1. Capture the Step 2 scan to a file (add `--baseline "$PWD/.fantasia/baseline.json"`
   if a baseline exists, exactly as in Step 2):

```bash
mkdir -p "$PWD/.fantasia"
node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-scan" "$PWD" --json > "$PWD/.fantasia/report-input.json"
```

2. Edit `report-input.json`: append each Step 2.5 `[judgment]` finding to the
   `findings` array (same shape as a scanner finding: `dimension`, `severity`,
   `id`, `title`, `why`, `evidence`, `fix`), and set `summary.grades.leverage` to
   the grade you recomputed in 2.5c. Change nothing else — and never add or unmask
   a secret value.

3. Render the augmented file:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-visual" "$PWD/.fantasia/report-input.json" --out "$PWD/FANTASIA-REPORT.html"
```

If you added no judgment findings and left the leverage grade untouched, skip the
file and pipe the scan straight in:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-scan" "$PWD" --json \
  | node "${CLAUDE_PLUGIN_ROOT}/bin/fantasia-visual" --out "$PWD/FANTASIA-REPORT.html"
```

Use the dev-fallback `node bin/...` form if `${CLAUDE_PLUGIN_ROOT}` is unset.

The renderer consumes ONLY the scanner's already-redacted JSON and HTML-escapes
every value, so the page can never contain a raw secret — the same guarantee as
the written report, enforced mechanically rather than by careful wording. You do
not assemble this file by hand; the renderer writes it.

Then point them to it. The safest, terminal-free line for a non-technical reader
is: *"It's saved as `FANTASIA-REPORT.html` in your project folder — double-click
it to open."* If they'd rather you open it for them, use the platform opener
(`start "" FANTASIA-REPORT.html` on Windows, `open FANTASIA-REPORT.html` on macOS,
`xdg-open FANTASIA-REPORT.html` on Linux). Confirm the path in one line.

### 6b. The written summary (`FANTASIA-REPORT.md`)

Use **Write** to create `$PWD/FANTASIA-REPORT.md` (or `<scanRoot>/FANTASIA-REPORT.md`
if a path argument was given) using the template below.

**Hard rules still apply to the file:** never write a real secret value — only
`redactedMatch`. Apply the per-file dedup (Step 3c) here too. Keep dismissed
findings out of the main body; they go in the small "Previously dismissed" note.

### The template

```markdown
# fantasia checkup — <project name or folder>

_Date: <YYYY-MM-DD> · fantasia v<fantasiaVersion> · scanned `<scannedRoot>`_

## Score

**<score>/100**

| Dimension | Grade | Group |
|---|---|---|
| Exposure | <grade> | Safety |
| Permissions | <grade> | Safety |
| Privacy | <grade> | Safety |
| Context | <grade> | Setup quality |
| Leverage | <grade>* | Setup quality |

\* Leverage is my assessment, not the scanner's deterministic result.

<one-line plain-English read of the score; if a baseline is in play, note how many
findings are new since it was accepted>

## What this means for your setup

**What Claude can reach from here.** <blast-radius summary from 3b(a): the kinds
of files Claude can open, whether broad command (`Bash`) access is on, what
connected tools can do, and whether anything sensitive sits inside that reach.>

**What this checkup touched.** Scanned <filesScanned> files under `<scannedRoot>`;
**read 0 file contents into this conversation**; skipped <node_modules, .git,
binaries, ignored files>; never looked above the project folder.

## Findings

### Reachable exposures (start here)
<The exposure correlations — `reachable: true`. Per-file deduped: one headline
per file with affected line numbers and count, redacted matches, evidence, fix.
If a baseline is in play, NEW reachable exposures go first.>

### <Dimension> — <Grade>
<Remaining findings grouped by dimension, severity-sorted, each with: title,
why it matters (contextual via `reachable`), how it was found (evidence; flag
`[judgment]` items as my assessment), the fix, and `file:line` + `redactedMatch`.>

<...repeat per dimension...>

## Fixed this session
<Bulleted list of findings resolved during this audit — id + file + one line on
what changed. "Nothing yet" if the user didn't apply any.>

## Still open
<Bulleted list of findings not yet addressed — id + file + the next step. These
are what a future checkup will pick up (unless dismissed or baselined).>

## Previously dismissed (<ignoredCount>)
<Only if ignoredCount > 0: the ids + files the user marked as fine, in one
compact line each. Omit this section entirely if there are none.>
```

Fill the placeholders from the JSON and the session. Keep the two access
statements verbatim in intent (blast-radius and "read 0 file contents"). After
writing, confirm the path in one line and offer the baseline (Step 5b) if you
haven't already.

---

## Voice (apply this everywhere — it is the point of the skill)

Follow `../../references/standards.md` for the full voice guidance. The essentials:

- **Plain language, no jargon.** Say "a script that you or I run," never
  "subprocess." Say "files Claude can open," not "read scope." Define any term
  you must use. Assume the reader will never `cd` or touch a terminal.
- **Never narrate your own plumbing.** Don't expose fantasia's internal words or
  think out loud about your mechanics. The reader should never hear "the fix
  loop," "the scanner JSON," "the findings," "config files," "diffs,"
  "redactedMatch," or "the exposure dimension." Translate to plain words: *your
  settings*, *what I found*, *the exact change*. If you need to look at your
  settings to prepare a precise fix, do it quietly or say it in one plain
  sentence.
  - ✗ "Now let me look at the config files so my report and proposed fixes are
    precise. These are config files (not the secret-holding files), and the fix
    loop needs exact diffs."
  - ✓ "Let me take a quick look at your settings so I can show you the exact
    change — I'm only opening your settings here, never anything that might hold
    a password."
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
