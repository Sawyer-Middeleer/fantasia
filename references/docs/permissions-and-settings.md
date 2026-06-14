# Permissions and settings

**Sources:**
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/permission-modes
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/security

---

## The short version

Claude Code has a permission system that controls exactly what it is allowed to
do — read files, run commands, fetch URLs, and so on. You can write rules that
allow things (so Claude doesn't have to ask each time), deny things (so Claude
can never do them), or leave them as the default (Claude asks before doing them).
These rules live in a file called `settings.json`.

---

## The allow / ask / deny model

Every tool Claude can use — reading files, running shell commands, fetching web
pages — goes through this system:

- **Allow**: Claude can do this without asking. Example: `Bash(npm run test)` —
  run this test command without prompting.
- **Ask** (the default): Claude will pause and ask you before doing this. Most
  things start here.
- **Deny**: Claude cannot do this at all. Example: `Read(./.env)` — Claude's
  file-reading tool is blocked from opening `.env`.

Rules are evaluated in this order: deny first, then ask, then allow. If a deny
rule matches, nothing else matters — the action is blocked.

**Important:** A deny rule written as a bare tool name (like `Bash`) removes
that tool from Claude entirely — Claude won't even try. A scoped rule like
`Bash(rm *)` lets Claude use Bash normally but blocks that specific pattern.

---

## What deny rules actually block (and what they don't)

This is the most important thing to understand about the permission system:

**Read and Edit deny rules block Claude's built-in file tools** — including
the `Read`, `Edit`, `Grep`, `Glob` tools, and shell file commands like `cat`,
`head`, `tail`, `sed` that Claude issues through its tool layer.

**They do NOT block:** arbitrary scripts you or Claude run that read files
directly at the operating system level. A Python or Node script that opens a
file bypasses Claude Code's permission rules entirely, because those rules
operate at Claude Code's tool layer, not at the OS level.

For OS-level enforcement that stops everything, you need the sandbox (see below).

**Practical example:** If you add `Read(./.env)` to your deny rules, Claude
cannot use its Read tool to open `.env`. But if you ask Claude to run a script
and that script opens `.env`, the deny rule doesn't stop it. This is why
fantasia explains the limitation honestly when it's relevant to your setup.

---

## The canonical deny snippet for secrets

This is what "fencing off your sensitive files" actually looks like in
settings.json — grounded in the official documentation:

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/*.pem)",
      "Read(**/id_rsa)",
      "Read(~/.ssh/**)",
      "Read(./secrets/**)"
    ]
  }
}
```

Put this in `.claude/settings.json` (applies to this project, shared with your
team) or `~/.claude/settings.json` (applies to all your projects).

Note the pattern types:
- `Read(./.env)` — matches `.env` in the current directory
- `Read(**/.env)` — matches `.env` anywhere under the current directory
- `Read(~/.ssh/**)` — matches everything under your SSH folder

---

## Why curl and wget are different

The docs note that `curl` and `wget` are not auto-approved by default. Unlike
`ls` or `cat` (which run without a prompt), these are deliberately held back
because they can send data *out* (potential exfiltration) and can be manipulated
by content Claude reads (prompt injection). They prompt like any other non-
read-only command.

If you want Claude to fetch web content, the safer route is:
```json
{
  "permissions": {
    "deny": ["Bash(curl *)", "Bash(wget *)"],
    "allow": ["WebFetch(domain:api.example.com)"]
  }
}
```

`WebFetch(domain:...)` restricts fetching to a specific domain and routes
through Anthropic's preflight check that blocks known malicious domains. Bash
with curl/wget doesn't have that protection.

Also: argument-constraining Bash rules are fragile. `Bash(curl http://x/ *)`
looks like it restricts curl to one URL, but it won't match if the protocol
is https, if there are flags before the URL, if a variable is used, or if a
redirect goes elsewhere. The docs explicitly warn against relying on these for
security — use deny + WebFetch instead.

---

## Permission modes

The mode controls how often Claude asks for permission. You can change modes
with Shift+Tab in the terminal (cycles through the main ones), or by setting
`defaultMode` in settings.json.

| Mode | What it does | When to use it |
|---|---|---|
| `default` | Claude asks before each new action | Getting started; sensitive projects |
| `acceptEdits` | File edits and common filesystem commands auto-approved | When you want to review via git diff after the fact |
| `plan` | Claude reads and plans but doesn't edit | Explore before committing to changes |
| `auto` | A classifier reviews actions in the background (research preview) | Long tasks where you trust the direction |
| `bypassPermissions` | Skips all permission prompts | **Containers/VMs only** — see below |

**bypassPermissions is dangerous outside a container.** It skips permission
prompts for everything, including writes to `.git`, `.config/git`, `.claude`,
and your shell config files. The docs say: "only use this mode in isolated
environments like containers or VMs where Claude Code cannot cause damage."
If you see `bypassPermissions` in your settings and you're not in a container,
that's a finding fantasia will flag as critical.

Admins can prevent bypass mode with:
```json
{ "permissions": { "disableBypassPermissionsMode": "disable" } }
```

**auto mode** (research preview): a separate classifier reviews each action
before it runs. It reduces prompts but doesn't make actions automatically safe.
The docs say: "use it for tasks where you trust the general direction, not as a
replacement for review on sensitive operations."

---

## Settings files and precedence

Settings live in several places and are applied in this order (higher wins):

1. **Managed settings** — deployed by your organization's IT team; cannot be
   overridden by anything below
2. **Command-line arguments** — temporary, for the current session only
3. **Local project settings** — `.claude/settings.local.json` — typically
   gitignored, your personal overrides for this project
4. **Shared project settings** — `.claude/settings.json` — committed to git,
   applies to everyone on the project
5. **User settings** — `~/.claude/settings.json` — applies to all your projects

Permission rules (allow/deny/ask) **merge** across scopes rather than override.
A deny rule at any level blocks an action even if an allow rule at another level
permits it.

**Where to put things:**
- Project-wide conventions → shared project settings (`.claude/settings.json`)
- Personal preferences → user settings (`~/.claude/settings.json`)
- Temporary tweaks → local settings (`.claude/settings.local.json`, gitignored)

---

## The sandbox

The sandbox is OS-level enforcement for Bash commands. Where deny rules operate
at Claude Code's tool layer, the sandbox restricts what Bash commands can
actually do at the operating system level — including what any child process
they spawn can do.

Enable it with the `/sandbox` command in a session, or:
```json
{ "sandbox": true }
```

The sandbox complements deny rules. Deny rules are fast and don't require a
container; the sandbox is thorough and blocks things deny rules can't. For
projects with real secrets or regulated data, using both is the right call.
Some workflows that need internet access or local tools may not work inside
the sandbox — evaluate per project.

---

## `.claudeignore` — what it does and doesn't do

`.claudeignore` follows gitignore syntax and controls which files Claude's
**directory walk** visits. It's useful for keeping large folders (like
`node_modules`) out of Claude's file searches.

It does NOT prevent Claude from opening a file if it knows the path. If someone
tells Claude "read `secrets/passwords.txt`" and there's no deny rule, Claude
can still open it even if `secrets/` is in `.claudeignore`.

To actually block Claude from opening a file, use a `Read` deny rule. Both
together give you search-level and direct-access-level protection.

---

## Quick reference: what each control does and doesn't do

| Control | Enforced by | Covers | Does NOT cover |
|---|---|---|---|
| `permissions.deny` Read rule | Claude Code tool layer | Claude's Read tool; shell file commands Claude issues | Standalone scripts that read files directly |
| `permissions.deny` Bash rule | Claude Code tool layer | The specific Bash pattern matched | Variations in args, protocol, variables, env-runners |
| `.claudeignore` | Claude Code file walk | Files Claude's directory walk visits | Files Claude opens by explicit path |
| `defaultMode: "default"` | Claude Code | Requires approval for unlisted actions | Actions explicitly allowed |
| Sandbox | Operating system | All file/network/subprocess access from Bash | Actions MCP tools take via their own network calls |
