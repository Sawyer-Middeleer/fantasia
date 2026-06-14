# CLAUDE.md and memory

**Sources:**
- https://code.claude.com/docs/en/memory

---

## The short version

Every Claude Code session starts fresh — Claude doesn't remember your last
conversation. CLAUDE.md is a plain text file you write to give Claude
persistent instructions for your project. Claude reads it at the start of
every session. Think of it as a briefing note you leave for a colleague
each day.

---

## What CLAUDE.md is for

CLAUDE.md is loaded into Claude's context window at the start of every
session. Use it for things Claude should know in every conversation:

- Build and test commands ("run `npm test` to test, `npm run build` to build")
- Conventions ("we use 2-space indentation, TypeScript strict mode")
- Project layout ("API handlers live in `src/api/handlers/`")
- "Always do X" rules ("never commit directly to main")
- Things you've had to re-explain before

**What not to put in CLAUDE.md:** Multi-step procedures or instructions that
only apply to one part of the codebase. Those belong in skills (which load
on demand) or path-scoped rule files. CLAUDE.md is loaded every session, so
keeping it focused means Claude follows it better.

---

## Where CLAUDE.md can live (and which one loads)

CLAUDE.md files can exist in multiple places and all get loaded. Claude
walks up your directory tree from your current folder and loads any CLAUDE.md
files it finds. Content is concatenated — they don't override each other.

| Location | Applies to | Shared with |
|---|---|---|
| `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) or `/etc/claude-code/CLAUDE.md` (Linux) | Everyone on this machine | Organization-wide (deployed by IT) |
| `~/.claude/CLAUDE.md` | All your projects | Just you |
| `./CLAUDE.md` or `./.claude/CLAUDE.md` | This project | Your team (commit to git) |
| `./CLAUDE.local.md` | This project | Just you (add to .gitignore) |

Files in subdirectories are loaded on demand when Claude reads files in
those directories, rather than at startup.

**Tip:** Run `/init` in a session and Claude will analyze your project and
generate a starter CLAUDE.md automatically. Run `/memory` to see which files
are currently loaded.

---

## How big can CLAUDE.md be?

The official recommendation is to target **under 200 lines** per CLAUDE.md
file. Longer files consume more of the context window (the space Claude has
to work with in one session) and may reduce how reliably Claude follows
the instructions — there's simply more for Claude to hold in mind.

If your instructions are getting long, use path-scoped rules (`.claude/rules/`
files with frontmatter that says which files they apply to) so instructions
only load when relevant. You can also import other files with `@path/to/file`
syntax, though imported files still count toward your context.

---

## Nested CLAUDE.md files

You can have different CLAUDE.md files in different subdirectories. Claude
loads them when it works with files in those directories. This is useful for
monorepos where different teams or services have different conventions.

If you're in a large repo and getting CLAUDE.md content from other teams
that isn't relevant to your work, you can exclude specific files in your
local settings:
```json
{
  "claudeMdExcludes": ["**/other-team/.claude/rules/**"]
}
```

---

## CLAUDE.md vs AGENTS.md

Claude Code reads **CLAUDE.md**, not AGENTS.md. AGENTS.md is used by some
other AI coding tools. If your repo already has an AGENTS.md for another
tool and you want Claude to follow the same instructions, the cleanest
approach is to create a CLAUDE.md that imports AGENTS.md:

```markdown
@AGENTS.md

## Claude Code specific notes
Use plan mode for changes under `src/billing/`.
```

Running `/init` in a repo that has AGENTS.md will read it and incorporate
the relevant parts into the generated CLAUDE.md.

A symlink (`ln -s AGENTS.md CLAUDE.md`) also works if you don't need to add
Claude-specific content, but requires Administrator privileges or Developer Mode
on Windows — the import approach works everywhere.

---

## CLAUDE.md is guidance, not enforcement

Instructions in CLAUDE.md shape what Claude tries to do, but they are not
enforced. Claude reads them and tries to follow them, but it won't always
comply strictly — especially with vague instructions. More specific
instructions ("use 2-space indentation" rather than "format code properly")
work better.

To actually block an action regardless of what Claude decides, use the
permission system (deny rules) or a PreToolUse hook. CLAUDE.md alone
doesn't prevent Claude from doing something.

---

## Auto memory

Auto memory is a complementary system where Claude writes notes for itself
as it works — build commands it figured out, preferences you corrected it on,
patterns it noticed. These are stored in `~/.claude/projects/<project>/memory/`
as plain markdown files you can read and edit.

Auto memory is on by default. To toggle it, run `/memory` in a session.

The first 200 lines of the memory file (or 25KB, whichever comes first) are
loaded at the start of each session. Topic files beyond that are read on
demand. This is different from CLAUDE.md, which is loaded in full.

Auto memory is machine-local — it's not shared across machines or team members.

---

## .claude/rules/ — for larger projects

For projects with many conventions, you can put instructions in separate
files in `.claude/rules/`. Each file should cover one topic and can be
scoped to specific file types:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API conventions
- All endpoints must include input validation
- Use the standard error response format
```

Rules with no `paths` frontmatter load at session start like CLAUDE.md.
Rules with `paths` load when Claude reads a matching file. This keeps
context smaller for big projects.
