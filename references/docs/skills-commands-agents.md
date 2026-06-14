# Skills, slash commands, and subagents

**Sources:**
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents

---

## The three things — and when to use each

| Thing | What it is | When to use it |
|---|---|---|
| **Skill** | A saved set of instructions Claude follows when you (or Claude) invokes it | Repeatable multi-step procedures; workflows you run often |
| **Slash command** | A way to invoke a skill — type `/skill-name` | Invoking built-in tools or your custom skills |
| **Subagent** | A separate Claude instance with its own context window | Keeping a side task's output out of your main conversation |

They work together. A skill can run inside a subagent. A slash command
invokes a skill. You don't need all three — most people start with skills.

---

## Skills

A skill is a `SKILL.md` file that gives Claude a set of instructions to follow
for a specific task. Claude either invokes it automatically when it recognizes
the task matches the skill's description, or you invoke it directly with a
slash command.

**Why skills instead of CLAUDE.md?** CLAUDE.md is loaded every session —
everything in it takes up space in Claude's context window even when you're
not doing that task. Skills load on demand, only when invoked. Long procedures,
checklists, and specialized workflows belong in skills, not CLAUDE.md.

**Where they live:**
- `~/.claude/skills/skill-name/SKILL.md` — available in all your projects
- `.claude/skills/skill-name/SKILL.md` — available in this project only

The directory name becomes the slash command. A skill at
`~/.claude/skills/pr-review/SKILL.md` is invoked with `/pr-review`.

**Basic structure:**
```markdown
---
description: Reviews pull requests for common issues. Use when the user asks
             to review a PR or check their changes before pushing.
---

## Instructions
Look at the diff and check for: missing error handling, hardcoded values,
tests that should be updated, and security issues. Summarize findings.
```

The `description` is what Claude uses to decide when to invoke the skill
automatically. Write it to describe the situation, not just the task:
"Use when the user asks to review a PR" not "PR review skill."

**Bundled skills** — Claude Code ships with built-in skills you can invoke:
`/code-review`, `/debug`, `/run`, `/verify`, `/batch`. These work the same way
as custom skills.

---

## Slash commands

Typing `/` in a session opens a list of all available commands and skills.
Slash commands invoke skills. The built-in ones (like `/help`, `/clear`,
`/compact`, `/model`, `/permissions`) run built-in Claude Code functions
rather than skills.

The key distinction:
- `/help` → built-in Claude Code command
- `/code-review` → bundled skill (ships with Claude Code)
- `/my-custom-workflow` → your own skill in `.claude/skills/`

All are typed the same way; they just do different things under the hood.

**Note:** The docs say "custom commands have been merged into skills." If you
have files in `.claude/commands/`, they still work — skills are the newer
equivalent with extra features like auto-invocation and subagent execution.

---

## Subagents

A subagent is a separate Claude instance that handles a specific task in its
own context window. The main Claude spawns it, it does its work, and it
returns only a summary to the main conversation.

**Why subagents?** Claude has a finite context window — the space it uses for
the current conversation. If you ask Claude to read 50 log files, analyze
each one, and summarize, all those log contents pile up in the context window.
With a subagent, the log files stay in the subagent's window; only the
summary comes back to you.

**When to use a subagent:**
- The task would flood your main conversation with output you won't look at
- You want to use a cheaper/faster model for a side task (Haiku for simple
  search, Opus for complex reasoning)
- You want to enforce constraints — a subagent can be given a restricted set
  of tools

**Where they live:**
- `~/.claude/agents/agent-name.md` — available in all your projects
- `.claude/agents/agent-name.md` — available in this project only

**Basic structure:**
```markdown
---
description: Searches the codebase for files relevant to a question. Use when
             the user asks where something is defined or which files to look at.
model: haiku
---

You are a code search specialist. When asked a question, search the codebase
for relevant files, read the key ones, and return a summary of what you found.
```

Claude uses the `description` to decide when to delegate to the subagent.
The `model: haiku` frontmatter means this subagent uses the faster, cheaper
Haiku model rather than the main model — good for search and exploration tasks.

**Subagents are not the same as background agents.** Background agents (the
agent view) run completely separate sessions you can monitor from one place.
Subagents run within your current session as spawned workers.

---

## Which one do I actually need?

**Start here:** If you keep typing the same instructions into the chat, make
a skill.

**Then:** If a section of your CLAUDE.md has grown into a multi-step
procedure, move it to a skill.

**Later:** If Claude's context fills up quickly on certain tasks (you see
"compacting" messages often or Claude seems to "forget" things within a
session), explore using subagents to offload heavy tasks.

Most people get significant value from just CLAUDE.md + a few skills, without
ever needing custom subagents.
