# Concern index — workshop pain taxonomy

The `ask` skill scans this file first to match a user's question to a known
concern. Organized by the real pain clusters from the workshop (plan §2).

For each concern: (a) real phrasings people use, (b) a tight plain-English
answer, (c) pointer to the relevant topic file and official docs.

---

## Cluster 1 — Access, secrets, and blast-radius fear

The dominant cluster. People are scared of what Claude can touch.

---

### "Can Claude see my passwords / API keys?"

**Real phrasings:**
- "can Claude see my passwords?"
- "how do we restrict Claude to not see passwords?"
- "Claude having access to things I don't want it to access to accidentally, without me knowing"
- "what settings safeguard files I don't want Claude to access?"
- "isn't it a privacy issue when Claude can read my files?"

**Answer:**
By default, Claude can read any file in your project folder — including
`.env` files, config files, and any file that contains credentials. It
doesn't do this randomly; it reads files when you ask it to work on something
that needs them. But the access is there unless you restrict it.

The fix is **deny rules** in your settings: entries in settings.json that
tell Claude Code "never open these files." The standard snippet:
```json
"permissions": { "deny": [
  "Read(./.env)", "Read(**/.env)", "Read(**/.env.*)",
  "Read(**/*.pem)", "Read(**/id_rsa)"
] }
```
This stops Claude's file-reading tool from opening those files. One caveat:
this doesn't stop an arbitrary script that you or Claude runs from reading
the file at the OS level. For airtight protection, pair deny rules with the
sandbox (`/sandbox`). fantasia's audit will tell you whether this caveat
matters for your specific setup.

**Also know:** `.claudeignore` is NOT the same as a deny rule. `.claudeignore`
controls which files show up in directory searches — Claude can still open
a file by its explicit path even if it's in `.claudeignore`. Use deny rules
for real protection.

**Docs:** `references/docs/permissions-and-settings.md`
→ `code.claude.com/docs/en/permissions`

---

### "I put a safety prompt in CLAUDE.md — is that enough?"

**Real phrasings:**
- one attendee wrote a 120-word prompt: "Never touch my passwords, API keys, or .env files…"
- "what settings give you that comfort to run on auto?"
- "how do I stop Claude from doing X?"

**Answer:**
A safety instruction in CLAUDE.md shapes what Claude *tries* to do, but
it's not enforced. Claude reads it and tries to follow it, but CLAUDE.md
is guidance, not a hard rule. The right tool for "never touch these files"
is a deny rule in settings.json — that's enforced by Claude Code's permission
system regardless of what Claude decides.

The 120-word prompt people were trading at the workshop is a workaround
for a real need that actual config can solve. fantasia's setup interview
turns that intent into enforced deny rules and a settings preset.

**Docs:** `references/docs/permissions-and-settings.md`, `references/docs/claude-md-and-memory.md`
→ `code.claude.com/docs/en/permissions`, `code.claude.com/docs/en/memory`

---

### "What's my blast radius? What can Claude actually touch?"

**Real phrasings:**
- "Claude having access to things I don't want it to access to accidentally"
- "how can we avoid this?"
- "what would happen if Claude went wrong?"

**Answer:**
By default, Claude can read any file in your project folder and its
subfolders. It can run Bash commands you've allowed (or that are on the
built-in read-only list). It can call any MCP tools you've connected. Write
operations (editing files, running modifying commands) prompt for your
approval in default mode.

To see what's actually allowed right now, run `/permissions` in a session.
fantasia's audit maps this for you — it shows exactly what Claude can reach
given your current settings.

**Docs:** `references/docs/permissions-and-settings.md`
→ `code.claude.com/docs/en/permissions`

---

### "What does bypassPermissions mean? Is it safe?"

**Real phrasings:**
- "bypassPermissions in my settings.json — what is that?"
- "someone told me to set bypassPermissions, should I?"

**Answer:**
`bypassPermissions` is a permission mode that skips all confirmation prompts.
Claude doesn't ask before doing anything — including writing to `.git`,
your shell config files, and Claude's own config. The documentation is very
clear: **only use this inside a container or virtual machine where Claude
cannot damage your actual system.** On a regular computer without isolation,
it removes every safety gate.

If you see `"defaultMode": "bypassPermissions"` in your settings.json and
you're not inside a container, that's a serious misconfiguration. fantasia
flags this as critical.

**Docs:** `references/docs/permissions-and-settings.md`
→ `code.claude.com/docs/en/permission-modes`

---

### "What about the deny-rule limit — can scripts still read denied files?"

**Real phrasings:**
- "does a deny rule actually stop everything?"
- "is adding a Read deny rule enough?"

**Answer:**
A deny rule blocks Claude's built-in file tools (Read, Grep, Glob, and
file commands like `cat` and `sed` that Claude issues through its tools).
It does NOT block a standalone script — if you or Claude runs a Python or
Node script that opens a file at the OS level, the deny rule doesn't stop it.

Whether this matters depends on your setup:
- If there are real secrets in your project and Bash is broadly allowed,
  the deny rule limit is important — you should also enable the sandbox.
- If there's nothing sensitive in the files, it's not a concern right now.

fantasia's audit shows which branch applies to your specific setup, rather
than alarming you about a theoretical risk that may not apply.

**Docs:** `references/docs/permissions-and-settings.md`
→ `code.claude.com/docs/en/permissions` (Read and Edit section)

---

## Cluster 2 — Config confusion

People are confused about the files Claude Code uses to configure itself.

---

### "What is CLAUDE.md? Do I need one in every folder?"

**Real phrasings:**
- "what is CLAUDE.md?"
- "do I need a CLAUDE.md in every folder?"
- "where does CLAUDE.md go?"

**Answer:**
CLAUDE.md is a plain text file (written in Markdown format) where you put
persistent instructions for Claude — things you'd otherwise have to re-explain
every session. Build commands, coding conventions, project structure, rules.
Claude reads it at the start of every session.

You only need one at your project root to start. Multiple CLAUDE.md files
in subdirectories are optional — useful for large projects where different
parts have different conventions. Claude loads them when it works on files
in those directories.

Start with one CLAUDE.md at the project root. Add subdirectory ones later
if you find yourself repeating different instructions for different parts of
the project. Run `/init` and Claude will generate a starter one from your
codebase.

**Docs:** `references/docs/claude-md-and-memory.md`
→ `code.claude.com/docs/en/memory`

---

### "CLAUDE.md vs AGENTS.md — what's the difference?"

**Real phrasings:**
- "claude.md vs agents.md?"
- "I have both — which one does Claude read?"
- "my repo already has AGENTS.md"

**Answer:**
Claude Code reads CLAUDE.md, not AGENTS.md. AGENTS.md is used by some
other AI coding tools (like Devin or Cursor). If your repo has AGENTS.md
for another tool, create a CLAUDE.md that imports it:

```markdown
@AGENTS.md

## Claude Code notes
Add any Claude-specific instructions here.
```

That way both tools read the same instructions without duplication. Running
`/init` in a repo with AGENTS.md will do this automatically.

**Docs:** `references/docs/claude-md-and-memory.md`
→ `code.claude.com/docs/en/memory` (AGENTS.md section)

---

### "Can you help me write settings.json? What goes in it?"

**Real phrasings:**
- "can you help me write settings.json?"
- "what settings give you that comfort to run on auto?"
- "what do I put in settings.json?"

**Answer:**
Settings.json is where you put rules about what Claude is and isn't allowed
to do — allow rules (don't ask for this), deny rules (never do this), and
the default permission mode. It lives in `.claude/settings.json` in your
project (shared with your team) or `~/.claude/settings.json` for your
personal defaults.

The simplest useful starting point:
```json
{
  "permissions": {
    "deny": [
      "Read(./.env)", "Read(**/.env)", "Read(**/.env.*)",
      "Read(**/*.pem)", "Read(**/id_rsa)"
    ]
  }
}
```

Run `/fantasia-safety-setup` to have the setup interview generate a settings.json
appropriate for your project and caution level. Run `/permissions` in a
session to view and edit rules interactively.

**Docs:** `references/docs/permissions-and-settings.md`
→ `code.claude.com/docs/en/settings`

---

### "What are the settings.json files and which one wins?"

**Real phrasings:**
- "there seem to be multiple settings files"
- "project vs user settings — which takes precedence?"

**Answer:**
There are several settings files and they're applied in order (higher wins):

1. Managed settings (deployed by your organization's IT)
2. Command-line flags (temporary, this session only)
3. `.claude/settings.local.json` (your personal overrides, gitignored)
4. `.claude/settings.json` (shared project settings, committed to git)
5. `~/.claude/settings.json` (your user settings, all projects)

Permission deny rules are special — they merge across all levels rather
than override. A deny rule anywhere blocks an action, even if another level
allows it.

**Docs:** `references/docs/permissions-and-settings.md`
→ `code.claude.com/docs/en/settings`

---

## Cluster 3 — "It feels out of reach / I'll hit a wall"

---

### "How do I get started without hitting a wall?"

**Real phrasings:**
- "how much did you eventually need fixed by a developer?"
- "I built a Gmail automation but it breaks when I try to extend it"
- "the advanced stuff (loops, knowledge graphs) feels out of reach"

**Answer:**
Start small and build up. The three things that make Claude Code more
reliable for non-technical users:

1. **A good CLAUDE.md** — give Claude the context it needs (what this
   project does, what not to touch, how to run tests). Run `/init` to
   generate one.
2. **Deny rules for sensitive files** — set them up once and stop worrying
   about what Claude can see.
3. **The right permission mode** — `default` mode means Claude asks before
   every significant action. This is the training wheels setting that lets
   you understand what Claude is doing before you trust it more.

fantasia's `/fantasia-safety-setup` interview generates all three from plain-English
answers. You don't need to understand the config files to get a sensible
starting setup.

**Docs:** `references/docs/permissions-and-settings.md`, `references/docs/claude-md-and-memory.md`
→ `code.claude.com/docs/en/quickstart`

---

### "The terminal feels scary — do I have to use it?"

**Real phrasings:**
- "I've never used the terminal"
- "is there a way to use Claude Code without the command line?"

**Answer:**
You don't have to use the terminal. Claude Code also runs as a Desktop app
(macOS and Windows), inside VS Code and JetBrains IDEs, and on the web at
claude.ai/code. The Desktop app gives you a graphical interface with the
same capabilities.

If you do use the terminal, the three commands you need are: navigate to
your project folder (`cd /path/to/project`), start Claude (`claude`), and
type questions in plain English. Claude handles the technical stuff.

**Docs:** `references/docs/git-and-setup.md`
→ `code.claude.com/docs/en/quickstart`, `code.claude.com/docs/en/terminal-guide`

---

## Cluster 4 — MCP / connectors

---

### "What's MCP? What's a connector?"

**Real phrasings:**
- "what is MCP?"
- "I see .mcp.json — what is that?"
- "someone mentioned a Gmail connector — what does that do?"

**Answer:**
MCP (Model Context Protocol) is a standard that lets Claude Code connect
to external tools and services. A connector (also called an MCP server) is
a plugin that gives Claude access to a specific service. With a Gmail
connector, Claude can search your email and draft messages. With a GitHub
connector, it can read issues and create pull requests.

The `.mcp.json` file in your project lists which connectors are configured.

**Important:** Anthropic does not security-audit third-party MCP servers.
Only connect servers from providers you trust. And scope the permissions
to the minimum you need — if you only want Claude to read email, don't
enable the send-email tool.

**Docs:** `references/docs/mcp-and-connectors.md`
→ `code.claude.com/docs/en/mcp`

---

### "Isn't a Gmail connector a privacy risk?"

**Real phrasings:**
- "if Claude can access Gmail, can it read all my emails?"
- "how do I make sure Claude only does what I want with connected tools?"

**Answer:**
Yes, a connected Gmail MCP server gives Claude the ability to read and
potentially send email, depending on which tools are enabled and allowed.
Claude doesn't read your entire inbox automatically — it only uses tools
when you ask it to do something that requires them, or when it decides
it needs email context to help you.

To control this: in your settings.json, explicitly allow only the read
tools (`search_emails`, `get_thread`) and leave write tools in "ask" mode.
Run `/permissions` to see what's currently allowed.

Also be aware of prompt injection: if Claude reads an email that contains
hidden instructions designed to make Claude take actions on your behalf,
that's a real risk with any MCP connector that reads external content.
It's an argument for keeping write tools in "ask" mode.

**Docs:** `references/docs/mcp-and-connectors.md`
→ `code.claude.com/docs/en/security` (MCP security section)

---

## Cluster 5 — Models and tokens

---

### "I ran out of tokens / Claude seems to forget things"

**Real phrasings:**
- "I ran out of tokens"
- "Claude forgot what we were doing"
- "I keep hitting limits"

**Answer:**
"Running out of tokens" can mean two things. If your conversation has gotten
very long, Claude Code will automatically "compact" (summarize) older parts
of it to make room — you'll see a compacting message and the conversation
continues. If you're hitting plan usage limits, you'll see a specific message
about rate limits or subscription limits.

To keep sessions from filling up: use `/clear` between unrelated tasks,
keep your CLAUDE.md concise (under 200 lines), and be specific in your
prompts (specific questions need fewer files read than vague ones).

Run `/usage` to see your current token consumption and plan limits.

**Docs:** `references/docs/models-and-tokens.md`
→ `code.claude.com/docs/en/costs`

---

### "Which model should I use? What's the difference?"

**Real phrasings:**
- "which model when?"
- "should I use Opus or Sonnet?"
- "what's Fable?"
- "the model picker is confusing"

**Answer:**
Four model families, from fastest/cheapest to most capable:

- **Haiku** — fast and cheap, for simple tasks and searches
- **Sonnet** — the everyday workhorse, handles most coding tasks well (the
  default on most plans)
- **Opus** — complex reasoning, architecture decisions, hard multi-step problems
- **Fable** — the most capable, for very long autonomous sessions and the
  hardest problems. Must be selected explicitly.

Start with Sonnet (the default). Switch to Opus with `/model opus` when
you're working on something complex that Sonnet seems to get wrong or
oversimplify. Try Fable for long sessions where you want Claude to work
autonomously for an extended time.

**Docs:** `references/docs/models-and-tokens.md`
→ `code.claude.com/docs/en/model-config`

---

### "Why does Claude give different answers each time?"

**Real phrasings:**
- "why did Claude say X yesterday but Y today?"
- "the answers are inconsistent"
- "is Claude making things up?"

**Answer:**
Claude is a probabilistic system — it generates responses by sampling from
a distribution of possible next words. This means the same question can
produce different (but equally valid) answers on different runs. This is
called non-determinism and it's fundamental to how large language models work.

In practice: if Claude gives an answer that seems wrong, asking again or
rephrasing often gets a better answer. Inconsistency doesn't mean Claude
"forgot" something — the conversation context was simply different enough
to tip the sampling in a different direction.

**Docs:** `references/docs/models-and-tokens.md`

---

## Cluster 6 — Skills, commands, agents

---

### "What's a skill? What's a slash command? Are they the same?"

**Real phrasings:**
- "what's a skill?"
- "what does /code-review do?"
- "I typed /something and nothing happened"

**Answer:**
A slash command is how you invoke a skill. You type `/skill-name` and Claude
runs the instructions in that skill's file. Built-in slash commands like
`/help`, `/clear`, and `/model` run Claude Code's own functions. Skills
like `/code-review` or `/debug` run saved sets of instructions.

You can also make your own: create a file at `.claude/skills/my-task/SKILL.md`
with instructions and it becomes `/my-task`. Skills load only when invoked,
unlike CLAUDE.md which loads every session — put detailed procedures in
skills to keep your CLAUDE.md lean.

**Docs:** `references/docs/skills-commands-agents.md`
→ `code.claude.com/docs/en/skills`

---

### "What's a subagent / background agent?"

**Real phrasings:**
- "what's a subagent?"
- "I keep seeing 'agent' — what is that?"

**Answer:**
A subagent is a separate Claude instance that Claude spawns to handle a
side task. It does its work in its own "context window" (its own working
memory) and returns only a summary. This keeps verbose output — like
reading many files or running long tests — out of your main conversation.

You don't need to set up subagents to start using Claude Code. They're a
tool for when your main conversation keeps getting very long or you want
to route certain tasks to a cheaper/faster model.

**Docs:** `references/docs/skills-commands-agents.md`
→ `code.claude.com/docs/en/sub-agents`

---

## Cluster 7 — Git and setup

---

### "Git vs GitHub — what's the difference?"

**Real phrasings:**
- "git vs GitHub?"
- "when Claude says 'commit,' is that saving to GitHub?"
- "do I need a GitHub account to use Claude Code?"

**Answer:**
Git is a tool on your computer that tracks file changes over time. GitHub
is a website where you can store and share that history online.

When Claude says "commit your changes," it means saving a snapshot in git
on your local machine — this doesn't involve GitHub at all. "Push to origin"
means sending those commits to wherever your remote repository is — which
might be GitHub, GitLab, or something else.

You don't need GitHub to use Claude Code. Claude Code works fine with
projects that only exist locally in git (or even without git at all).

**Docs:** `references/docs/git-and-setup.md`
→ `code.claude.com/docs/en/quickstart`

---

### "How do I install Claude Code?"

**Real phrasings:**
- "how do I get Claude Code?"
- "where do I download it?"
- "how do I install this?"

**Answer:**
On Mac/Linux: open your terminal and run
`curl -fsSL https://claude.ai/install.sh | bash`

On Windows (PowerShell):
`irm https://claude.ai/install.ps1 | iex`

Or install the Desktop app from claude.ai/download for a graphical interface.

After installing, type `claude` in your terminal (or open the Desktop app)
and log in with your Claude account.

**Docs:** `references/docs/git-and-setup.md`
→ `code.claude.com/docs/en/quickstart`
