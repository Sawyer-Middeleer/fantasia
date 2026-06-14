---
name: fantasia-safety-setup
description: >-
  A warm, plain-English interview that sets up Claude Code safely for you. Use
  when someone is getting started, just installed Claude Code, or asks how to
  configure or set up a project the safe way. Triggers on phrasings like "help
  me set up Claude Code", "I just installed Claude Code", "set up my project",
  "configure this safely", "how do I get started", "make a CLAUDE.md", "how do I
  write settings.json", "what settings keep Claude from touching my passwords".
  Asks a few plain questions — no jargon — then generates a right-sized
  CLAUDE.md, secret-fencing rules, and a settings file matched to how cautious
  you want to be, each previewed and written only with your OK, then runs the
  audit so you watch your fresh setup score green.
argument-hint: "[path to project, defaults to current folder]"
---

# fantasia — setup

A friendly, jargon-free interview that turns plain-English answers into a safe,
sensible starting config for Claude Code. We ask a few questions about your
project, then generate the files that keep Claude helpful *and* in its lane:
a `CLAUDE.md` (project notes for Claude), secret-fencing rules, and a settings
file matched to how cautious you want to be. Nothing is written without your OK,
and at the end we run the audit so you can watch your fresh setup score green.

**The flow, end to end:** warm intro + what we'll create (Step 1) → the
interview, one question at a time (Step 2) → generate each file as a preview,
written only on your yes (Step 3) → optional light structure if your work spans
several projects (Step 3d) → hand off to `/fantasia-safety-check` so you see the score
(Step 4).

The deeper "what good looks like" detail lives in the shared reference files —
consult them as you go rather than duplicating them here:

- **`../../references/standards.md`** — the privacy invariant, the caution-preset
  philosophy, the canonical safe-config fixes, and the voice rule. This is the
  same standard the `audit` skill checks against, so what we set up here is
  exactly what a clean audit looks for. Setup and audit can't drift.
- **`../../references/checks.md`** — the full catalog of what a good setup avoids,
  if the user wants the reasoning behind a particular rule.

---

## Hard rules (read before doing anything)

1. **Disclose, then act.** Before the interview, say in one line what setup will
   create (new files in their project). Before writing *any* file, show it as a
   preview and wait for an explicit yes — collected through the **AskUserQuestion**
   tool (see rule 7). Nothing is written without approval.
2. **One topic at a time, no jargon.** Ask a single question, wait for the
   answer, then ask the next. Define any term the first time it comes up (e.g.
   "MCP — that's how Claude connects to outside accounts like Gmail or Slack").
   Assume the person will never use a terminal.
3. **Right-size everything.** Don't generate a routing section, a STATUS.md, or
   a long CLAUDE.md for a simple one-folder project. Match the output to what
   they actually told you.
4. **Recommend `careful` for beginners.** When mapping their cautiousness answer
   to a preset, lean toward `careful` unless they clearly want less friction and
   understand the tradeoff.
5. **Ground the secret-fencing in what they told you.** Tune the deny rules and
   `.claudeignore` to the sensitive things they named — don't just paste a
   generic block and move on.
6. **Always offer the next step.** End every part with a clear, low-friction
   choice. Never leave them staring at a decision with no door forward.
7. **Use the AskUserQuestion tool for every fixed-choice decision.** The caution
   level (Q5), each file-write approval (Step 3), the optional-structure offer
   (3d), and the run-the-checkup handoff (Step 4) all have a known set of answers
   — present them as structured options via the **AskUserQuestion** tool, never as
   a prose question you wait on. The open-ended interview questions (Q1–Q4: what
   the project is, what's sensitive, and so on) stay as ordinary conversation —
   they have no fixed answers. Rule of thumb: **if you can list the choices, use
   the tool.**

---

## Step 1 — Warm intro and what we'll create

Open warmly and disclose what setup does, in plain language. Keep it short:

> **Hi — let's get your Claude Code setup sorted, the safe way.**
>
> I'll ask you a few quick questions about your project — nothing technical, and
> I'll explain anything that needs explaining. From your answers I'll create a
> small set of starter files **in this project folder**:
>
> - a **`CLAUDE.md`** — a plain notes file that tells Claude what your project is
>   and what's off-limits, so you don't have to re-explain it every time;
> - **safety rules** that fence off your passwords and sensitive files so Claude
>   won't read them;
> - a **settings file** tuned to how cautious you want Claude to be.
>
> I'll **show you each file before I save it**, and I won't write anything until
> you say go. At the end we'll run a quick checkup so you can see it all land
> green. Sound good? We'll start with one easy question.

Then go to Step 2. If a path argument was given, treat that folder as the
project; otherwise use the current folder.

---

## Step 2 — The interview (one question at a time)

Ask these **one at a time**, in order. Wait for each answer before the next.
Keep it conversational — reflect their answer back briefly so they feel heard,
and only ask follow-ups if something's genuinely unclear. Capture the answers;
you'll use them to fill in the files in Step 3.

**Q1 — What is this project?**
> "First — in a sentence or two, what is this project? For example: 'a folder of
> marketing copy for my coaching business,' or 'a small website for my shop,' or
> 'where I keep my client spreadsheets.' Just tell me in your own words."

*Captures:* project identity and what it is (top of CLAUDE.md).

**Q2 — What do you want Claude's help with here?**
> "What would you like Claude to help you with in this project? Writing? Editing?
> Organizing files? Answering questions about what's here? Building something?
> There's no wrong answer — it just helps me set Claude up to be useful."

*Captures:* the "what Claude helps with" line, and a hint at how complex the
project is (used later to decide whether a routing section or STATUS.md helps).

**Q3 — What in here is sensitive or off-limits?**
> "Is there anything in this folder that's sensitive or you'd rather Claude never
> open? Things like passwords or API keys (the secret codes apps use to log into
> each other), client or customer data, financial records, medical info, or
> personal details. Even just 'I think there might be a file with passwords' is
> useful — I'll fence those off."

*Captures:* the off-limits list. Drives the `.claude/settings.json` `Read` deny
rules, the `.claudeignore`, and the explicit "off-limits" section in CLAUDE.md.
If they're unsure, reassure them: the canonical rules already cover the usual
suspects (`.env` files, keys, the `secrets/` folder), and the audit at the end
will catch anything we missed.

**Q4 — What outside accounts or tools do you connect?**
> "Does Claude connect to any outside accounts or tools here — like Gmail,
> Slack, a calendar, a database, or anything similar? (These connections are
> called **MCP** — it's just the plumbing that lets Claude reach an outside
> service.) If you're not sure or it's none, that's perfectly fine — we can
> always set those up carefully later."

*Captures:* whether MCP is in play. You're **not** configuring MCP servers here —
just noting it so you can flag, gently, that connected tools widen what Claude
can do, and that the audit will inventory them. If they name write-capable tools
(send email, post messages, move money), note that the `careful`/`balanced`
presets leave those needing per-request approval — a good default.

**Q5 — How cautious do you want Claude to be?**
> "Last one, and it's the important one: how cautious do you want Claude to be?
> Think of it as how often Claude checks with you before doing something. Three
> settings:
>
> - **Careful** — Claude asks before almost everything. Most visibility, least
>   chance of a surprise. Best if you're new to this or the project has sensitive
>   stuff in it. *(I'd recommend this one to start — you can always loosen it
>   later.)*
> - **Balanced** — Claude handles a few obviously-safe things on its own (like
>   reading files, checking git status, running your tests) but still asks before
>   anything riskier.
> - **Fast** — Claude auto-accepts edits and routine commands inside this folder
>   to keep things moving. Handy for low-stakes work, but it checks in less.
>
> Which feels right?"

Show those three plain-English descriptions in the message, then ask with the
**AskUserQuestion** tool — don't make them type the answer. Use header
`Caution level`, question "How cautious should Claude be?", options
(recommended first):

- **Careful (Recommended)** — "Claude asks before almost everything. Best to start."
- **Balanced** — "Claude does obviously-safe things on its own, asks before anything riskier."
- **Fast** — "Auto-accepts edits and routine commands in this folder; checks in less."

If they choose "Other," read their free text as their cautiousness answer and map
it to the nearest preset, defaulting to `careful` when unsure.

*Captures:* the preset. Map their answer to `careful` / `balanced` / `fast`. For
a beginner or a project with sensitive data, steer toward `careful`. The
philosophy behind each is in `../../references/standards.md §6` — read it if you
need to explain a tradeoff. If they pick `fast`, mention plainly that fast still
keeps the guardrails that matter: it never bypasses permissions entirely, it
still fences off your secrets, and it still blocks the risky network commands
(`curl`/`wget`) — it just stops asking about routine edits.

When the interview is done, briefly summarize what you heard ("So: a folder of
client invoices, you want help organizing and summarizing them, the invoices
themselves are sensitive, no outside tools connected, and you want the careful
setting — that all sound right?"), then move to Step 3.

---

## Step 3 — Generate the files (preview, then write on approval)

Generate each file below **as a preview first**, then write it only after an
explicit yes — and collect that yes with the **AskUserQuestion** tool, not a prose
question. For each file: show the preview, then ask (header `Save file?`):
**Save it** · **Change something first** ("tell me what to adjust and I'll
re-preview") · **Skip this one**. Use **Write** to create a new file and **Edit**
to amend one that already exists (read it first so you append rather than
clobber). Go in order; do one, get the choice, then the next.

### 3a. CLAUDE.md

Start from `../../templates/CLAUDE.md.template` and fill it in from the
interview. (That template is maintained alongside this skill — reference it by
path; don't invent your own structure.) Right-size it:

- **Project identity + what it is** — from Q1.
- **What Claude helps with / conventions** — from Q2. Keep conventions to what
  they actually told you; don't pad with generic advice.
- **An explicit "Off-limits" section** — from Q3. Name the sensitive things in
  plain words ("Don't open the `invoices/` folder or anything with client
  financial data"). This mirrors, in human language, the deny rules you'll add
  in 3b — the two reinforce each other.
- **A routing section ONLY if the project is complex enough** — multiple
  distinct areas of work, several sub-folders with different purposes. For a
  simple one-folder project, skip it. (See `ready-for-structure` in
  `../../references/checks.md` for when this is worth it.)

Preview it, then on a yes write it to `<project>/CLAUDE.md`.

### 3b. Secret and sensitive fencing

This is the heart of the safety setup, and it's **two complementary controls** —
explain both plainly, because the difference matters (it's the folklore fix that
people get half-right):

1. **`Read` deny rules in `.claude/settings.json`** — the documented control.
   These stop Claude from opening a file with its file tools. This is the part
   most people miss when they only use an ignore file.
2. **`.claudeignore`** — keeps the files out of Claude Code's directory walk, so
   they don't get surfaced by accident.

You'll fold the deny rules into the settings file in 3c (so it's one file, not
two settings files). Build the `.claudeignore` from
`../../templates/claudeignore.template`, then **tune it to what they told you in
Q3** — if they named an `invoices/` folder or a `clients.xlsx`, add those paths.

Be honest about the limit, the way the standard requires (`standards.md §4.1`):
a deny rule stops Claude from opening the file directly, but a script you or
Claude runs in the project could still read it at the operating-system level.
Whether that matters right now depends on whether there's a real secret there —
**don't raise it as alarming if there isn't.** If they have genuinely sensitive
data, mention the sandbox (an OS-level boundary, turned on with `/sandbox`) as
the airtight option, and that the audit at the end will tell them if it's worth
it for their setup.

Preview the `.claudeignore`, then on a yes write it to `<project>/.claudeignore`.

### 3c. .claude/settings.json from the caution preset

Copy the preset matching their Q5 answer:

- `careful` → `../../templates/settings.careful.json`
- `balanced` → `../../templates/settings.balanced.json`
- `fast` → `../../templates/settings.fast.json`

Each preset already includes the canonical secret-fencing `Read` deny rules
(`.env`, `**/.env*`, `**/*.pem`, `**/id_rsa`, `~/.ssh/**`, `./secrets/**`) and
already blocks `curl`/`wget`. **Then merge in deny rules for the specific
sensitive paths they named in Q3** — e.g. add `"Read(./invoices/**)"` or
`"Read(./clients.xlsx)"` to `permissions.deny`. Keep it valid JSON.

What the three presets differ on (explain in plain words if asked, don't dump
the JSON):

- **careful** — `defaultMode: "default"` (Claude asks before unlisted actions),
  no broad auto-allows so everything prompts, and it locks out the two riskiest
  modes so they can't be switched on by accident.
- **balanced** — same default mode, plus a short list of obviously-safe commands
  Claude can run without asking (read-only git, your test/build/lint/dev
  scripts). Still asks before anything else; still blocks `curl`/`wget`.
- **fast** — `defaultMode: "acceptEdits"` so Claude auto-accepts edits and
  routine file commands inside the folder, with a slightly broader safe-command
  list. It keeps every guardrail that matters: never full bypass, secrets still
  fenced, `curl`/`wget` still blocked.

Preview the final merged file, then on a yes write it to
`<project>/.claude/settings.json`. If `.claude/settings.json` already exists,
**don't clobber it** — read it, show what you'd add (the deny rules, the chosen
mode, the safe allows), and merge with **Edit**, keeping anything they already
had unless it conflicts with the safety rules (in which case flag it and ask).

### 3d. Optional: light structure ("context-OS lite")

**Offer, don't force.** Only if their answers suggest their work spans multiple
clients or projects (e.g. Q1/Q2 mention "several clients," "different projects,"
or a folder-per-client layout), offer a simple structure:

> "One optional extra: since you're juggling a few different clients, I can add a
> tiny `STATUS.md` — a running note of what you're working on and where things
> stand — plus a simple folder-per-client layout, so Claude (and you) can always
> pick up where you left off. Totally optional."

Then ask with the **AskUserQuestion** tool (header `Extra structure`): **Add it** ·
**No thanks**. On **Add it**, generate a minimal `STATUS.md` (current focus, recent
decisions, what's next) and propose a simple folder layout — the smallest useful
version, not a full system. Preview it, then save it through the same
`Save file?` choice as the other files (Step 3 intro). If their project is simple,
**skip this entirely** — don't mention it or ask.

---

## Step 4 — Hand off to the audit (watch it score green)

Once the files are written, close the loop by running the sibling skill so they
see their fresh setup graded:

> "That's your setup in place. Want to run a quick checkup so you can see it land?
> It scores your setup and confirms the safety rules took — and should come back
> high, because I set things up to the exact standard the checkup looks for."

Then ask with the **AskUserQuestion** tool (header `Run checkup?`): **Run the
checkup now** · **Maybe later**. On **Run the checkup now**, invoke
**`/fantasia-safety-check`** on the same project folder. Setup and audit
read the same `../../references/standards.md`, so a setup done with the `careful`
or `balanced` preset should produce a clean run — secret fencing in place, no
loose permissions, a `CLAUDE.md` present. If anything still shows up (for
example, the audit may note the OS-level sandbox is off, or flag genuinely
sensitive files it found), walk them through it in the audit's own fix loop —
that's exactly what it's for.

Frame it as the satisfying finish: they answered a few questions, and now they
can watch the score confirm they're set up safely — with every rule explained,
nothing hidden, and a clear next step if they want to go further.

---

## Voice (apply this everywhere — it is the point of the skill)

Follow `../../references/standards.md §4` for the full voice guidance. The
essentials, same as the `audit` skill so the two feel like one tool:

- **Plain language, no jargon.** Define any term the first time — "MCP," "deny
  rule," "sandbox." Assume the reader will never use a terminal.
- **First-person-plural and warm.** "Let's get this sorted," "here's what I'll
  create," "want me to add that?" Collaborative, never an audit-report lecture.
- **Grounded, never abstract or alarming.** Tie every caveat to *their* project
  and what they told you. Don't warn about a theoretical risk that doesn't apply
  to their setup — if there's nothing sensitive here, say so plainly instead of
  raising the deny-rule limit as if it's urgent (see `standards.md §4.1`).
- **One thing at a time.** One question, one file preview, one decision. Never a
  wall of questions or a batch of files dumped at once.
- **Always offer the next step.** Every part ends with a clear choice: answer
  this, approve this file, skip the optional bit, run the checkup.
