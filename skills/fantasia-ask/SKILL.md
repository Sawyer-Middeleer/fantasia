---
name: fantasia-ask
description: >-
  Plain-English answers to Claude Code questions, for people who are new to it
  and don't want jargon. Use when someone asks a confused or beginner question
  about how Claude Code works, what a setting does, or what a term means.
  Triggers on phrasings like "what's MCP?", "git vs GitHub?", "which model
  should I use?", "what does this setting do?", "I ran out of tokens", "what's a
  context window?", "claude.md vs agents.md?", "do I need a CLAUDE.md in every
  folder?", "is the terminal safe?", "what's a skill?", "how do permissions
  work?", "can Claude send email as me?". Answers from a concern-first knowledge
  base grounded in the official docs, falls back to the live docs for anything
  uncovered, and can personalize the answer to the user's own config — "in your
  case". For "am I exposed / is my setup safe" it hands off to the audit; for
  "help me set this up" it hands off to setup.
argument-hint: "[your question]"
---

# fantasia — ask

Plain-English Q&A for Claude Code, written for someone who is early in their
journey and will never `cd`. It starts from the **real questions people actually
ask** (the workshop pain clusters), answers from a distilled, doc-grounded
knowledge base, falls back to the live official docs for anything uncovered, and
— the part that beats just reading the docs — can ground the answer in *your*
actual setup ("in your case…").

**The flow, end to end:** match the question to a concern (Step 1) → pull the
detail from the matching topic file (Step 2) → if neither covers it, fetch the
live docs (Step 3) → optionally personalize from the user's own config (Step 4) →
answer in plain English and offer the obvious next step (Step 5).

This skill is a sibling of `/fantasia-safety-check` (the safety checkup) and
`/fantasia-safety-setup` (the guided setup). When a question is really a request to
*check* or *configure* something, hand off — see "When to hand off" below.

The actual content lives in the shared reference files — this skill is the
*procedure* for finding and delivering it, not a place to duplicate answers:

- **`../../references/concerns.md`** — the workshop pain taxonomy: the real
  phrasings people use, mapped to plain answers and pointers. **Check this
  first.**
- **`../../references/docs/*.md`** — distilled, plain-English topic files
  (`permissions-and-settings`, `claude-md-and-memory`, `mcp-and-connectors`,
  `skills-commands-agents`, `models-and-tokens`, `git-and-setup`, plus
  `index.md`). Pull the detail from the matching topic.

> These reference files are maintained alongside the skill. Reference them by
> path; don't invent your own versions, and don't hard-code answers here that
> belong in them.

---

## Hard rules (read before answering)

1. **Never invent Claude Code behavior.** If the concern file and the topic
   files don't cover it, do **not** answer from memory — fetch the live docs
   (Step 3) and answer from those. If you're still unsure, say so plainly and
   say where you'd look. A confident wrong answer is the worst outcome here.
2. **This skill explains; it does not audit.** You may read the user's *config*
   to personalize an answer (Step 4), but you do **not** scan their project for
   secrets, you do **not** open files that look sensitive, and you **never** echo
   a secret value. For "am I exposed / is my setup safe," hand off to
   `/fantasia-safety-check`, which has the proper redaction and consent machinery.
3. **Define every term the first time you use it**, in one short plain-English
   clause — "MCP (a connector that lets Claude reach another app like Gmail)",
   "token (a chunk of text — roughly a few characters — that Claude reads and
   writes in)". Don't assume any prior knowledge. Don't repeat the definition
   once you've given it.
4. **Short first, detail on request.** Lead with a 2–4 sentence answer. Offer a
   "want the detail?" expansion rather than dumping a wall of text up front.
5. **Always end with a door forward** — the obvious next step, a hand-off, or a
   related question they probably have next. Never leave them with a bare fact.
6. **Say where the answer came from** when it matters — "from the official docs"
   for a live fetch, "I looked at your config" when you personalized it. No
   black-box answers.

---

## Step 1 — Concern-first lookup (start here, always)

Don't start from "which doc topic is this?" Start from **"what is this person
actually worried about?"** — because the way people phrase these questions rarely
matches the docs' vocabulary. Someone who types *"can this thing see my
passwords?"* is not searching for "permissions reference."

Open `../../references/concerns.md` and match the user's question to a concern.
That file maps the **real phrasings** (the workshop pain clusters) to a plain
answer and a pointer to the right topic file. Match on intent, not keywords —
the same concern shows up as *"git vs GitHub?"*, *"do I need a GitHub account?"*,
and *"where does my code actually go?"*

If you find a match, take its plain answer as the spine of your response and go
to Step 2 to pull the supporting detail. If nothing in `concerns.md` fits, go to
Step 2 anyway and try the topic files directly; if those miss too, Step 3.

---

## Step 2 — Pull the detail from the matching topic file

Each concern points to one of the distilled topic files in
`../../references/docs/`. Open the matching one and pull the specifics — these
are already written in plain English and grounded in the official docs, so you're
translating *less*, not more. The topics, roughly:

- **`permissions-and-settings.md`** — what Claude can touch and how to fence it;
  `settings.json`, allow/deny rules, permission modes, the sandbox. (Questions
  like "what does this setting do?", "is the terminal safe?", "how do I stop
  Claude touching X?")
- **`claude-md-and-memory.md`** — `CLAUDE.md` vs `AGENTS.md`, memory, do-I-need-
  one-per-folder. ("claude.md vs agents.md?", "do I need a CLAUDE.md in every
  folder?")
- **`mcp-and-connectors.md`** — MCP and connectors: what they are, what they let
  Claude do, the risks. ("what's MCP?", "can Claude send email as me?")
- **`skills-commands-agents.md`** — skills, slash commands, subagents — what each
  is and when to reach for it. ("what's a skill?", "what's a subagent?")
- **`models-and-tokens.md`** — models (Opus/Sonnet/Haiku) and which to pick;
  tokens, context windows, "running out." ("which model should I use?", "I ran
  out of tokens", "what's a context window?")
- **`git-and-setup.md`** — git vs GitHub, accounts, the terminal, getting
  started. ("git vs GitHub?", "is the terminal safe?")
- **`index.md`** — the map of the above; use it to route when the concern file
  didn't point you cleanly.

Synthesize a plain answer from the topic file. Don't read the whole file aloud —
pull the one or two points that answer *their* question.

---

## Step 3 — Live fallback (only when the references don't cover it)

If neither `concerns.md` nor the topic files answer the question, **do not guess
from memory.** Fetch the official docs and answer from those:

1. Start from the docs index at **`https://code.claude.com/docs/llms.txt`** —
   it's a plain list of every doc page, so use it to find the right page for the
   question.
2. `WebFetch` the specific page you identified (under
   `https://code.claude.com/docs/`) and answer from its contents.
3. **Tell the user it's from the live docs** — e.g. "I checked the official docs
   for this one." If you couldn't find a clear answer even there, say so honestly
   and point them at the relevant docs page rather than inventing one.

This is the safety net behind hard rule #1: the references are the fast path,
the live docs are the source of truth, and your own memory is never the
authority on Claude Code behavior.

---

## Step 4 — Personalize ("in your case") — the differentiator

This is what makes `ask` better than just handing someone the docs: once you've
got the general answer, ground it in *their* setup. Only when it actually sharpens
the answer — don't force it.

**What you may read, and only these:** the user's *config* files —

- `.claude/settings.json` (and `.claude/settings.local.json`, `~/.claude/settings.json`)
- `.mcp.json`
- `CLAUDE.md` / `AGENTS.md`

Use them to make the answer concrete. Examples of the payoff:

- *"What's MCP?"* → "It's a connector that lets Claude reach another app. **In
  your case**, your `.mcp.json` has Gmail connected — so yes, Claude can draft
  emails as you. Here's how to scope that down if you'd rather it only read…"
- *"What does this setting do?"* → read the actual line in their
  `settings.json` and explain *that* rule, not a generic example.
- *"Do I need a CLAUDE.md?"* → check whether they already have one and tailor
  the answer.

**The guardrails on this (non-negotiable):**

- **Config only.** Read the files listed above and nothing else. Do **not** walk
  the project, grep for secrets, or open data files, source files, or anything
  that looks sensitive (`.env`, `*.pem`, `secrets/`, financial/medical/personal
  files). That's the audit's job, with its consent and redaction machinery — not
  this skill's.
- **Never echo a secret value.** If a config file happens to contain one (it
  shouldn't, but `.mcp.json` sometimes holds tokens), do not repeat it — refer to
  it as "the token you've got in there" and, if it's a real exposed secret,
  hand off to `/fantasia-safety-check` rather than dwelling on it here.
- **Explain, don't change.** `ask` answers questions; it doesn't edit config.
  If the answer is "you should change X," offer to hand off to `/fantasia-safety-setup`
  (to configure) or `/fantasia-safety-check` (to check and fix) rather than editing
  files yourself.
- **It's optional.** If reading their config wouldn't sharpen the answer, skip it
  and just answer the general question well.

### When to hand off

- **"Am I exposed? Is my setup safe? Can Claude see my passwords? What can it
  touch?"** → this is a *checkup*, not a question. Answer the conceptual part
  briefly, then hand off: "I can explain how access works — but to actually check
  *your* setup safely, that's what `/fantasia-safety-check` is for. It runs a local scan
  that reads the bytes so I never see your secrets. Want me to kick that off?"
- **"Help me set this up / configure this / make a CLAUDE.md / write a
  settings.json."** → hand off to `/fantasia-safety-setup`: "There's a guided setup for
  exactly this — `/fantasia-safety-setup` asks a few plain questions and generates the
  files for you, each previewed before it's saved. Want to run it?"

Answer the *understanding* question here; route the *doing* to the sibling skill.

---

## Step 5 — Answer style (apply the voice)

Follow `../../references/standards.md §4` for the full voice guidance — `ask`
sounds like its siblings on purpose. The essentials:

- **Plain English, every term defined once.** "MCP (a connector that lets Claude
  reach another app)", "token (a chunk of text Claude reads and writes in)",
  "context window (how much Claude can hold in mind at once)". No condescension —
  define the term and move on, never "as you probably know."
- **Short, concrete, first-person-plural.** 2–4 sentences answering the actual
  question, grounded in a concrete example over an abstract one. "We", "I", "in
  your case" — collaborative, not a lecture.
- **Lead with the answer, offer the detail.** Give the short version first, then
  *"want the detail?"* — don't open with a wall of text. Expand only if they want
  it.
- **Calibrated, never alarming.** If something genuinely has a risk, say so
  plainly and point to the fix. If it doesn't apply to them, don't manufacture a
  worry — the §4 voice rule applies here too.
- **End with the obvious next step or related question.** "Want me to show how to
  scope that down?" "The related thing people usually ask next is X — want that?"
  "That's really a setup question — want me to run `/fantasia-safety-setup`?" Never end
  on a bare fact.

The goal: someone leaves the answer understanding the thing *and* their own
setup, with a clear door to whatever they want to do next.
