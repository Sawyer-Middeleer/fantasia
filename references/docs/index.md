# fantasia docs — orientation map

This folder is a distilled plain-English knowledge base for the `/fantasia-ask`
skill. Each file covers one topic area, written for someone who is new to Claude
Code and may not be technical.

**Source**: official docs at `code.claude.com/docs`. Each topic file cites its
sources at the top. Rebuilt with `scripts/refresh-docs.mjs`.

---

## Files in this folder

| File | Covers |
|---|---|
| `permissions-and-settings.md` | Allow/deny rules, permission modes, settings files, what bypassPermissions means, curl/wget behavior |
| `claude-md-and-memory.md` | What CLAUDE.md is, where it lives, how big, nested files, CLAUDE.md vs AGENTS.md, auto memory |
| `mcp-and-connectors.md` | What MCP is, how connectors work, the security note, how to scope MCP permissions |
| `skills-commands-agents.md` | Skills vs slash commands vs subagents — what each is and when to use which |
| `models-and-tokens.md` | Haiku / Sonnet / Opus / Fable — when to use which; what tokens are; running out; non-determinism |
| `git-and-setup.md` | Git vs GitHub, terminal vs Desktop app, installing Claude Code, first steps |

---

## Top concerns — quick map

These are the pain clusters from the workshop. Use this to orient before
reading a full topic file.

| "I'm wondering about…" | Go to |
|---|---|
| "Can Claude see my passwords?" | `permissions-and-settings.md` → deny rules |
| "What's a .env file?" | `permissions-and-settings.md` → deny rules |
| "What's bypassPermissions / is it safe?" | `permissions-and-settings.md` → modes |
| "Settings.json is confusing" | `permissions-and-settings.md` → settings files |
| "What is CLAUDE.md?" | `claude-md-and-memory.md` |
| "CLAUDE.md vs AGENTS.md?" | `claude-md-and-memory.md` → AGENTS.md section |
| "Do I need a CLAUDE.md in every folder?" | `claude-md-and-memory.md` → where it lives |
| "What is MCP?" | `mcp-and-connectors.md` |
| "Gmail connector — is it safe?" | `mcp-and-connectors.md` → security note |
| "What's a skill? What's a command?" | `skills-commands-agents.md` |
| "I ran out of tokens" | `models-and-tokens.md` → running out |
| "Which model when?" | `models-and-tokens.md` → model guide |
| "Why does Claude give different answers?" | `models-and-tokens.md` → non-determinism |
| "Git vs GitHub?" | `git-and-setup.md` |
| "Terminal feels scary" | `git-and-setup.md` → terminal vs Desktop |
| "How do I install Claude Code?" | `git-and-setup.md` → installation |

---

Also see `references/concerns.md` — the concern index the ask skill scans first,
with real workshop phrasings mapped to short answers and pointers here.
