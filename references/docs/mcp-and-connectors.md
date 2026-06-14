# MCP and connectors

**Sources:**
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/security

---

## What MCP is (in one sentence)

MCP (Model Context Protocol) is an open standard that lets Claude Code connect
to external tools and services — like Gmail, Slack, GitHub, or a database —
so Claude can read and act on those systems directly instead of you copying
data into the chat by hand.

---

## What MCP servers (connectors) actually do

When you connect an MCP server, Claude gets a set of new tools it can call.
For example, a Gmail MCP server might give Claude tools like `search_emails`,
`create_draft`, and `send_email`. Claude can then do things like:

- "Find all emails from my accountant this month" — Claude calls the search tool
- "Draft a reply saying I'll send the invoice tomorrow" — Claude calls the draft tool
- "What features were discussed in the Slack channel last week?" — Claude reads Slack

The tools show up in the conversation just like Claude's built-in tools (Read,
Bash, etc.), and the same permission system applies — Claude will ask before
using a write tool like `send_email` unless you've explicitly allowed it.

---

## The critical security note

**Anthropic does not security-audit third-party MCP servers.**

The official docs say: "We encourage either writing your own MCP servers or
using MCP servers from providers that you trust." Anthropic reviews connectors
against listing criteria before adding them to the Anthropic Directory
(claude.ai/directory), but that review is not a security audit of the server
itself.

This means:
- A malicious or compromised MCP server could potentially take actions on
  the connected account
- MCP servers that fetch external content expose you to prompt injection —
  an attacker could embed instructions in content Claude fetches, trying to
  make Claude take actions you didn't intend
- You should only connect MCP servers from providers you genuinely trust

---

## What "trust verification" means

When you first connect a new MCP server, Claude Code asks you to explicitly
trust it before running. This is a one-time step per server — Claude Code
records your decision. In non-interactive mode (scripts, `-p` flag), trust
verification is skipped, which is worth knowing if you're automating things.

---

## Why an MCP connector can be more powerful than it looks

An MCP server that can "send emails" or "move money" or "delete files"
can do those things at Claude's direction. If Claude is reading content
from the web and that content contains hidden instructions (a prompt
injection attack), Claude might be manipulated into using a connected tool
in ways you didn't intend.

This is why the recommendation is to scope MCP permissions to the minimum
you actually need. Instead of allowing all tools from a server:

```json
{
  "permissions": {
    "allow": [
      "mcp__gmail__search_emails",
      "mcp__gmail__get_thread"
    ]
  }
}
```

Leave write tools (`create_draft`, `send_email`) as "ask" (the default),
so Claude has to ask you before using them.

---

## How to add an MCP server

The quickest way is the `claude mcp add` command:

```bash
# Connect a remote HTTP server (most cloud services)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Connect a local script (tools that need system access)
claude mcp add --transport stdio my-tool -- npx -y my-mcp-package
```

After adding, restart your session or run `/mcp` to see the connected servers.

MCP server configurations are stored in `.mcp.json` (project-level, committed
to git) or `~/.claude.json` (user-level, all projects). Servers in `.mcp.json`
require a one-time trust confirmation per user.

---

## Scoping MCP in settings

You can control which MCP tools Claude can use without asking in your
`settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__my_server__read_data",
      "mcp__my_server__search"
    ],
    "deny": [
      "mcp__my_server__delete_*"
    ]
  }
}
```

The pattern is `mcp__<server-name>__<tool-name>`. You can use wildcards:
`mcp__gmail__*` matches every Gmail tool, `mcp__*` matches every MCP tool
on every server.

Deny rules for MCP work the same way as for other tools — they're evaluated
first and cannot be overridden.

---

## If Claude can use Gmail: what does that actually mean?

If you have a Gmail MCP connector and Claude has permission to use it, Claude
can draft and potentially send emails as you. The same principles apply as
for any other tool:

- What Claude can draft/send depends on which tools are allowed
- If `send_email` is in your allow list, Claude can send without asking
- If `send_email` is not in your allow list (or explicitly denied), Claude
  will ask before sending
- Scope down to the minimum: `search_emails` and `get_thread` for read-only
  use; only add write tools when you specifically need them

fantasia's audit will flag any MCP servers it finds that have write-capable
tools and will show you which tools are currently allowed without asking.
