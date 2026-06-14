# fantasia — Standards & "What Good Looks Like"

This file is the shared standard that **both** the `audit` skill and the `setup`
skill read. When they share this file, they cannot drift from each other — a
principle that `setup` teaches becomes one that `audit` checks, and vice versa.

Written for an audience that may not be technical, so every term is defined the
first time it appears. Precise enough that a skill can follow it exactly.

---

## 1. The privacy invariant

**The scanner reads bytes. Claude only ever sees redacted, structured findings.
Claude never opens a flagged file.**

This is not a courtesy — it is the architecture. `fantasia-scan` is a dumb
byte-matcher: it knows a pattern looks like an AWS key; it does not know what
the key unlocks or who owns the account. Reading a password is not a risk when
the reader is a regex engine that will immediately replace it with `AKIA••••`.
The risk is *Claude* reading the secret into its context window, where it becomes
part of a conversation that could be logged, replayed, or exfiltrated.

So the design separates the two roles:
- **`fantasia-scan`** reads the bytes, applies rules, redacts every match, and
  emits a JSON findings array. It runs locally, offline, and sends nothing
  anywhere.
- **Claude (the `audit` skill)** reads only the JSON findings array — never the
  source file, never the raw match. It renders findings in plain English and
  proposes fixes.

This model is borrowed from `gitleaks --redact 100`, which was designed for
exactly the same reason.

**Hard rule for the `audit` skill:** never use `Read`, `Grep`, `cat`, `sed`, or
any other tool to open a file that the scanner flagged. Operate only on the
scanner's output. If a user asks "what does that file contain?", the correct
answer is: "I haven't looked at it and I'm not going to — that's the guarantee.
You can open it yourself to confirm."

---

## 2. Disclose before acting

Every scan and every fix is preceded by a clear, specific statement of what will
happen, what is and isn't accessed, and waits for explicit consent before
proceeding.

**Before a scan**, show the full disclosure (see `plan.md §9` for the canonical
text). It must cover:
- What runs (a local script; no network calls; nothing sent anywhere)
- What it reads (config files, project files — with exact scope)
- What it looks for (settings, secrets, sensitive data, reachability)
- What it will NOT do (open file contents into the chat; read secret values;
  change anything; look outside the project)
- The guarantee (the script reads bytes; Claude only sees redacted findings)

Then wait. Do not proceed until the user says yes (or an equivalent).

**Before a fix**, show exactly what will change — ideally as a diff — and
explain why, in plain English. Then wait for approval. Apply one fix at a time.
Re-scan after each fix to confirm it worked.

This principle applies to the setup skill too. Before generating any config file,
tell the user what you are about to create and where it will go.

---

## 3. Show your work (provenance)

Every finding carries an `evidence` field. Show it. The user should be able to
understand how the finding was detected and judge for themselves whether it is
accurate — without trusting the tool blindly.

Evidence is always one of:
- `"filename matches X"` — a file matched a name pattern (e.g. `*.pem`)
- `"regex rule Y + entropy Z"` — a string matched a secret rule and has high
  Shannon entropy (a measure of randomness that distinguishes real keys from
  placeholder values)
- `"keyword 'X' near 'Y'"` — sensitive keywords found in proximity
- `"settings.json permissions.allow contains Bash(*)"` — a specific value found
  in a specific settings file

If the evidence is a judgment call by Claude (rather than a deterministic script
finding), say so: "This is my assessment based on what I see in the config — not
a deterministic rule — so treat it with that in mind."

Never surface a black-box finding. If you cannot show your work, do not make the
claim.

---

## 4. The VOICE RULE

**Plain language. Contextual. Grounded in what was found. Never abstract or
alarming.**

Every finding, every caveat, every explanation follows this pattern:

> "X doesn't fully cover Y — which **matters here because** ⟨grounded reason
> tied to what the scan actually found in this project⟩"
>
> *or*
>
> "…which **isn't a concern right now because** ⟨grounded reason⟩ — just worth
> knowing if that changes."

The branch is chosen based on the scan results — specifically, the correlation
check (§5.3 of the plan): if a real exposure was found in this project, use the
"matters here because" branch. If no exposure was found, use the "not a concern
right now because" branch. Never raise a concern in the abstract.

### 4.1 The worked example: the deny-rule limit

A `Read` deny rule stops Claude from opening a file using its file tools. But it
does not stop an arbitrary shell script (run via `Bash`) from reading the same
file at the OS level. Here is how to communicate that caveat correctly — both
ways:

**Branch A: Real secret found (use "matters here because")**

> "Adding a deny rule stops me from opening `config/old.js` directly. It won't
> stop a script that you or I run in this project from reading it — and that
> **matters here, because that file has a live key in it.** The airtight fix is
> turning on the sandbox; want me to set that up too?"

**Branch B: No secret found (use "not a concern right now because")**

> "A deny rule stops me from opening that file directly. A script we run could
> still read it — **not something to worry about right now, since there's nothing
> sensitive there** — just worth knowing if that changes."

### 4.2 Additional voice rules

- **First-person plural.** "We", "us", "I'll check", "want me to". Never cold
  third-person. The tone is collaborative, not audit-report-formal.
- **Define every term, once.** The first time you use a term like "context
  window," "entropy," "prompt injection," or "MCP server," give a one-sentence
  plain-English definition. Don't repeat the definition on every finding.
- **Accurate over reassuring, but calibrated.** Do not downplay real risks. But
  also do not alarm someone about a theoretical risk that doesn't apply to their
  setup. The goal is an accurate picture of *their* situation, not a worst-case
  generic warning.
- **Always offer a next step.** Every finding ends with a question or an offer:
  "Want me to add that deny rule?" / "Should I set that up?" / "I can explain
  more if useful." Never leave someone staring at a problem with no door forward.
- **Never echo a secret value.** Even if somehow a raw value appeared in the
  scanner output, do not repeat it. Say "I've redacted that value" and move on.

---

## 5. Canonical safe-config fixes

These are the specific, documented fixes for the most common misconfigurations.
Each section includes what the fix does AND what it doesn't do — honesty is part
of the standard.

### 5.1 The `permissions.deny` Read snippet

The primary tool for fencing off sensitive files from Claude's file tools.

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

**What it covers.** Claude's `Read` tool, and shell commands that Claude issues
via its tool layer (including `cat`, `sed`, `awk`, `grep`, and similar). These
deny rules are enforced by Claude Code's permission system before the tool runs.

**What it does not cover.** A standalone script that you (or Claude, via a
`Bash` invocation) runs that directly calls the OS to read a file. Deny rules
operate at the Claude Code tool layer, not at the OS level. The sandbox is the
OS-level enforcement.

**Where to put it.** In `.claude/settings.json` for project-scoped rules, or
`~/.claude/settings.json` for user-wide rules. Project settings take effect
for everyone working in that directory.

### 5.2 Reverting a risky `defaultMode`

`bypassPermissions` skips all prompts — including writes to `.git` and `.claude`
— without any confirmation. The documentation says it is "only for isolated
environments." Outside a container or VM, it removes every safety gate.

To revert:
```json
{
  "defaultMode": "default"
}
```

To prevent anyone from switching to bypass mode in your project (useful for
shared or team settings):
```json
{
  "permissions": {
    "disableBypassPermissionsMode": "disable"
  }
}
```

**What "default" mode means.** Claude asks for permission before each action
it hasn't been explicitly told to allow. This is the behavior most users expect
and the right starting point.

### 5.3 Replacing `Bash(curl *)` with `WebFetch(domain:…)`

If you need Claude to fetch content from the web, use `WebFetch` rather than
allowing curl via Bash. The difference:

- `Bash(curl *)` — allows Claude to run curl with any arguments, including
  sending data *out* (exfiltration), following redirects to arbitrary URLs, or
  being manipulated by a prompt injection to call an attacker's server.
- `WebFetch(domain:example.com)` — allows Claude to fetch from a specific
  domain, routed through Anthropic's preflight check that blocks known malicious
  domains.

The documentation notes that `curl` and `wget` are deliberately not
auto-approved by default, precisely because they are the primary exfiltration
and prompt-injection vector.

```json
{
  "permissions": {
    "deny": ["Bash(curl *)", "Bash(wget *)"],
    "allow": ["WebFetch(domain:api.example.com)", "WebFetch(domain:docs.example.com)"]
  }
}
```

### 5.4 Scoping MCP permissions

MCP (Model Context Protocol) servers give Claude access to external services —
Gmail, Slack, databases, payment systems. Anthropic does not security-audit
third-party MCP servers. Broad MCP allows (`mcp__*`) give Claude unrestricted
access to everything a server can do.

Scope to specific servers and tools:

```json
{
  "permissions": {
    "allow": [
      "mcp__my_server__read_data",
      "mcp__my_server__search"
    ]
  }
}
```

Omit write, delete, send, and payment tools from the allow list unless they are
specifically needed. Let those require per-request approval.

### 5.5 Enabling the sandbox

The sandbox runs Claude in an OS-level container. It is the only control that
provides airtight enforcement: files, network, and subprocesses are restricted
at the OS level, regardless of what Claude Code's permission rules say. It
complements (rather than replaces) deny rules — deny rules are fast and don't
require a container; the sandbox is thorough.

Enable via the Claude Code `/sandbox` command, or add to settings:
```json
{
  "sandbox": true
}
```

**Tradeoff.** Some workflows that require internet access or local tool
installation may be restricted inside the sandbox. Evaluate per project. For
projects with real secrets or regulated data, the tradeoff is usually worth it.

---

## 6. Caution presets (for `setup`)

The `setup` skill generates a `settings.json` from one of three presets based
on the user's answer to "how cautious should Claude be?" The presets live in
`templates/settings.{careful,balanced,fast}.json`.

The philosophy of each:

### `careful` — Maximum visibility, minimum auto-approval

Every significant action requires a confirmation. No broad allow rules. Network
access requires explicit approval per request. Appropriate for:
- Sensitive projects (financial, medical, legal, personal data)
- New users who want to understand what Claude is doing before it does it
- Projects where mistakes are hard to reverse (production systems, live data)

The hand-written 120-word safety prompt that workshop attendees were trading with
each other becomes actual *enforced config* at this level.

### `balanced` — Sensible defaults, targeted permissions

Auto-approves low-risk, reversible operations (reading files, running tests, git
status). Requires approval for writes outside the project root, network calls,
and MCP write operations. The right default for most development projects.

This is the preset `setup` proposes first, unless the user's answers indicate
they need more or less friction.

### `fast` — Convenience for low-stakes or sandboxed work

Broader auto-approvals for users who understand the tradeoffs and are working in
an environment where mistakes are recoverable (e.g. inside a sandbox, on a
project with no sensitive data, in a throwaway workspace). NOT recommended
without the sandbox enabled — say so when offering this option.

---

## 7. A note on settings precedence

Claude Code applies settings in this order (higher overrides lower):

1. **Managed settings** (set by organization admins via MDM or fleet tools) — cannot be overridden
2. **CLI flags** (passed at invocation time)
3. **Local project settings** (`.claude/settings.local.json` — typically gitignored)
4. **Shared project settings** (`.claude/settings.json` — typically committed)
5. **User settings** (`~/.claude/settings.json` — applies everywhere)

When explaining a finding, always attribute it to its source file. When
proposing a fix, suggest the right scope: a project-wide convention goes in
shared project settings; a personal preference goes in user settings; a
temporary override goes in local settings.

---

## Quick reference: what each control does and doesn't do

| Control | Enforced by | Covers | Does NOT cover |
|---|---|---|---|
| `permissions.deny` Read rule | Claude Code tool layer | Claude's Read tool; shell commands Claude issues via its tool layer | Standalone scripts run directly at the OS; Bash commands that bypass the tool layer |
| `permissions.deny` Bash rule | Claude Code tool layer | The specific Bash invocation pattern matched | Variations in argument order, HTTPS vs HTTP, variables, env-runners |
| `defaultMode: "default"` | Claude Code | Requires approval for unlisted actions | Does not restrict actions that are explicitly allowed |
| `skipWebFetchPreflight: false` (the default) | Anthropic's preflight service | Known malicious domains | Unknown domains not yet in the blocklist |
| Sandbox | Operating system | All file, network, and subprocess access | Actions Claude takes via allowed MCP tools that make their own network calls |
| `.claudeignore` | Claude Code file walk | Files Claude Code's directory walk visits | Files Claude reads by explicit path if no deny rule blocks it |
