# fantasia — Audit Check Catalog

This is the single source of truth for every check the `audit` skill runs.
Derived faithfully from `plan.md §7`. When adding a new check, add it here first
— then it automatically flows to audit (flags it), setup (prevents it), and ask
(explains it).

---

## How to read this catalog

| Column | Meaning |
|---|---|
| **id** | Machine key in the finding JSON; also shown to users in the fix loop |
| **sev** | `critical` / `high` / `medium` / `low` / `info` |
| **dim** | Dimension grouping (exposure / permissions / privacy / context / leverage) |
| **detect** | `[script]` = deterministic regex/entropy/config parse; `[judgment]` = model assesses |
| **why** | Plain-English reason this matters |
| **fix** | What to do, including exact config snippets where relevant |

**Detection method matters.** `[script]` findings come from `fantasia-scan` and
always carry an `evidence` field showing exactly how they were found (e.g.
"matched rule `aws-access-key` (regex + entropy 4.3)"). `[judgment]` findings
come from Claude's assessment of the redacted scan output — they may have lower
confidence and always say so.

**The skill must never open a flagged file.** It operates only on the redacted
JSON that `fantasia-scan` emits. The evidence field is how the user can verify
the finding without exposing secrets to Claude.

---

## A. Credentials & secrets — dimension `exposure`

These are the highest-severity findings. A credential in a readable file is a
direct attack surface: Claude, any subagent, or a prompt injection can read and
exfiltrate it if your permission rules don't block the path.

---

### `secret-in-readable-file`

| Field | Value |
|---|---|
| **sev** | critical |
| **dim** | exposure |
| **detect** | `[script]` regex + Shannon entropy + keyword prefilter |

**Why it matters.** An API key, password, or token sitting in a plain file is
readable by anything Claude can run — including subagents and prompt injections —
unless a `Read` deny rule explicitly blocks the path. Even if the file is
gitignored, it is still in your project folder and reachable.

**Evidence format.** `file:line` + `redactedMatch` (e.g. `AKIA••••••••••••`) +
entropy score + rule name. The real value is never shown to Claude.

**Fix.**
1. Move the secret to an environment variable or a secrets manager.
2. Rotate the key — treat it as compromised once it has been in a file.
3. Add a `Read` deny rule (see canonical block below).
4. Add the file to `.claudeignore` and `.gitignore`.

**Canonical `Read` deny rule block** (documented syntax, paste into
`.claude/settings.json` → `permissions.deny`):

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

**Honest limit.** A `Read` deny rule stops Claude from opening the file using
its file tools (`Read`, `cat`, `sed`, etc. — anything routed through Claude's
tool layer). It does **not** stop an arbitrary shell script that you or Claude
runs with `Bash`. The sandbox (an OS-level container) is the airtight fix — see
`sandbox-off` in section C. Surface this limit only when the correlation check
(`reachable-secret`) finds a real exposure AND broad Bash access is enabled.

---

### `private-key-present`

| Field | Value |
|---|---|
| **sev** | critical |
| **dim** | exposure |
| **detect** | `[script]` PEM headers, `id_rsa`, `id_ed25519`, `*.pem`, `*.key` filename patterns |

**Why it matters.** Private keys are used for authentication and signing. A key
in your project folder can be read by Claude or any tool it runs unless fenced
off. Unlike a rotatable API key, some private keys (e.g. SSH host keys) require
infrastructure changes to rotate.

**Fix.** Relocate the key outside the project root, or add a `Read` deny rule
for the path and add the file to `.claudeignore`. Rotate the key if there is any
chance it was read by an unintended process.

---

### `secret-in-settings`

| Field | Value |
|---|---|
| **sev** | critical |
| **dim** | exposure |
| **detect** | `[script]` secret-pattern regex applied to `settings*.json` and `.mcp.json` values |

**Why it matters.** Settings files are read by Claude Code on startup and are
often committed to version control. A secret value in a settings file is
simultaneously in Claude's context and potentially in your git history.

**Note.** The scanner redacts any secret value it finds in a settings file before
passing findings to Claude. Claude never sees the raw value.

**Fix.** Remove the raw value. Use environment variable references or, for MCP
servers, the `apiKeyHelper` field (which runs a command to fetch the secret at
runtime). Never commit settings files that contain secrets.

---

### `credentials-file-exposed`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | exposure |
| **detect** | `[script]` checks `~/.claude/.credentials.json` file permissions (should be `0600`) and whether its parent directory is inside a synced folder (Dropbox, iCloud Drive, Google Drive, etc.) |

**Why it matters.** Claude Code stores your authentication credentials here.
Group- or world-readable permissions mean other users on the machine can read it.
Placing it in a cloud-synced folder uploads it to a third-party service.

**Fix.** Run `chmod 0600 ~/.claude/.credentials.json`. Move the `.claude`
directory out of any synced folder, or configure your sync tool to exclude it.

---

## B. Non-credential sensitive data — dimension `exposure`

These are files that don't contain machine-readable secrets but do contain
information an agent (or a swarm of 1,000 subagents) shouldn't be processing
without explicit intent. The finding is informational unless the correlation check
finds the file is reachable.

> **What makes fantasia different from gitleaks:** gitleaks finds *credentials*.
> fantasia also flags *sensitive context* — financial records, medical data,
> legal documents — that could be inappropriately read, logged, or transmitted
> by an agent that has broad file access.

---

### `sensitive-financial`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | exposure |
| **detect** | `[script]` keyword/pattern pack: `invoice`, routing numbers, SSN patterns, card number patterns, `*tax*.{xlsx,pdf}`, `salary`, `payroll` |

**Why it matters.** Financial records often contain personally identifiable
information (PII). Giving an agent broad file access without fencing off financial
files means that data can end up in transcripts, tool outputs, or sub-agent
context windows.

**Fix.** Add `Read` deny rules for the paths containing financial files. Add to
`.claudeignore`. Consider moving sensitive spreadsheets and PDFs outside the
project root entirely if they are not needed for the task at hand.

---

### `sensitive-medical`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | exposure |
| **detect** | `[script]` keyword pack: `diagnosis`, `patient`, `prescription`, `DOB` appearing near names or identifiers |

**Why it matters.** Medical data is highly regulated (HIPAA in the US). An agent
reading patient records without explicit safeguards is a compliance and privacy
risk regardless of whether the data is exfiltrated.

**Fix.** Same as `sensitive-financial` — fence off with `Read` deny rules and
`.claudeignore`. For regulated workloads, consider whether the sandbox is
required.

---

### `sensitive-legal-pii`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | exposure |
| **detect** | `[script]` keyword pack: `confidential`, `settlement`, `passport`, addresses appearing near names |

**Why it matters.** Legal documents and PII (personally identifiable information)
carry confidentiality obligations. Medium severity because this category has a
higher false-positive rate — a file containing the word "confidential" in a
heading may be routine business correspondence.

**Fix.** Review the flagged file (you, not Claude). If genuinely sensitive, apply
`Read` deny rules and `.claudeignore`.

---

## C. Loose security settings — dimension `permissions`

All checks in this section are grounded in the Claude Code permissions and
security documentation. Settings findings are deterministic — the scanner reads
your config files and compares them to the known-risky patterns.

---

### `mode-bypass-permissions`

| Field | Value |
|---|---|
| **sev** | critical |
| **dim** | permissions |
| **detect** | `[script]` `defaultMode: "bypassPermissions"` in any settings file |

**Why it matters.** `bypassPermissions` mode skips all permission prompts —
including writes to `.git` and `.claude` — without any confirmation. The official
documentation states this mode is "only for isolated environments" (containers or
VMs where a mistake can be thrown away). In a regular working directory it removes
every safety gate.

**Fix.** Revert `defaultMode` to `"default"`. To prevent anyone from switching to
this mode in your project, set `permissions.disableBypassPermissionsMode:
"disable"` in your shared project settings.

---

### `mode-auto`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | permissions |
| **detect** | `[script]` `defaultMode: "auto"` in any settings file |

**Why it matters.** `auto` mode is a research-preview that auto-approves a broad
set of actions. It significantly reduces the friction that protects you from
mistakes and prompt injections.

**Fix.** Reconsider whether this is intentional. To lock it out entirely, set
`disableAutoMode: "disable"` in your project or user settings.

---

### `mode-accept-edits-persisted`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | permissions |
| **detect** | `[script]` `acceptEdits` set as a persisted default in settings (rather than a per-session choice) |

**Why it matters.** When `acceptEdits` is a persisted default, Claude
automatically accepts file operations — including `rm`, `mv`, and `cp` within
your working directory — without a per-operation prompt.

**Fix.** Remove from persisted settings. Let it be a per-session choice when you
consciously want that convenience.

---

### `bash-wide-open`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | permissions |
| **detect** | `[script]` bare `Bash` or `Bash(*)` in `permissions.allow` |

**Why it matters.** A bare `Bash` allow rule drops the permission prompt for the
entire Bash tool — every shell command, without restriction. This is the
permission equivalent of handing over a master key.

**Fix.** Remove the broad rule. Rely on per-command approval for most tasks, or
write specific allow rules for the exact commands you need (e.g.
`Bash(git status)`, `Bash(npm test)`).

---

### `network-bash-allowed`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | permissions |
| **detect** | `[script]` `Bash(curl *)` or `Bash(wget *)` in `permissions.allow` |

**Why it matters.** The Claude Code docs note that `curl` and `wget` are
deliberately **not** auto-approved by default, because they are the primary
vectors for data exfiltration and prompt injection from the network. An explicit
allow rule overrides that protection. A malicious payload fetched from the
network could then read your files and send them out.

**Fix.** Move to `permissions.deny`. Replace outbound HTTP needs with
`WebFetch(domain:…)` allow rules, which Anthropic's preflight check covers.

---

### `fragile-arg-rule`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | permissions |
| **detect** | `[script]` argument-constraining Bash rules (e.g. `Bash(curl http://specific-site.com/ *)`) |

**Why it matters.** Argument constraints on Bash are bypassable. A rule like
`Bash(curl http://x/ *)` can be circumvented by using HTTPS, a redirect, a
variable, or a different flag ordering. It creates a false sense of security.

**Fix.** Don't rely on Bash argument rules for network control. Use
`permissions.deny` to block curl/wget outright, and `WebFetch(domain:…)` for
the domains you actually need. For finer control, write a `PreToolUse` hook that
validates the exact command before it runs.

---

### `env-runner-allowed`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | permissions |
| **detect** | `[script]` `Bash(npx *)`, `Bash(docker exec *)`, `Bash(devbox run *)`, or similar env-runner patterns in `permissions.allow` |

**Why it matters.** These commands are effectively `Bash(*)` — they run arbitrary
code inside the named environment. Allowing `npx *` means any npm package can
run without a prompt.

**Fix.** Replace with specific inner-command rules, or remove and rely on
per-command approval.

---

### `webfetch-all-domains`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | permissions |
| **detect** | `[script]` bare `WebFetch` in `permissions.allow` (no domain restriction) |

**Why it matters.** Without a domain restriction, Claude can fetch any URL
without prompting. This is a lower risk than `Bash(curl *)` because WebFetch is
routed through Anthropic's preflight check, but it still removes the per-request
confirmation.

**Fix.** Replace with `WebFetch(domain:example.com)` rules for the specific
domains your workflow needs.

---

### `webfetch-preflight-off`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | permissions |
| **detect** | `[script]` `skipWebFetchPreflight: true` in any settings file |

**Why it matters.** Anthropic's preflight check blocks known malicious domains
before Claude fetches them. Disabling it removes that protection.

**Fix.** Remove `skipWebFetchPreflight: true`. If you need to fetch domains the
preflight blocks, evaluate whether those domains are actually safe, then use
explicit `WebFetch(domain:…)` rules rather than disabling the check globally.

---

### `mcp-wide-open`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | permissions |
| **detect** | `[script]` `mcp__*` wildcard allow, or all tools of a write-capable MCP server auto-allowed |

**Why it matters.** MCP (Model Context Protocol) servers extend Claude with
external tools — including tools that can send email, post to Slack, modify
databases, or move money. Anthropic does **not** security-audit third-party MCP
servers. A broad allow means any of those actions can be taken without a prompt.

**Fix.** Scope MCP permissions per server and per tool. Allow only the specific
tools you use regularly. Require confirmation for write operations.

---

### `mcp-write-capable`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | permissions |
| **detect** | `[script]` inventory of connected MCP servers that have tools capable of sending email, posting messages, deleting records, or moving money |

**Why it matters.** This is an informational inventory, not an error. It surfaces
the blast radius: "if Claude is compromised by a prompt injection, here are the
real-world actions it could take." Medium severity because having write-capable
MCP tools is often intentional.

**Fix.** Confirm the tools listed are intentional. Apply least-privilege scoping
— allow only the subset of tools the current project actually uses. For
particularly high-stakes tools (payment, deletion), add a trust-verification
step or require explicit confirmation via a `PreToolUse` hook.

---

### `opaque-hook`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | permissions |
| **detect** | `[script]` `PreToolUse` or `PostToolUse` hooks running shell commands |

**Why it matters.** Hooks run on every matching tool call. An opaque hook
(a shell script whose behavior isn't visible in the settings) can silently allow,
block, or log actions. This is a power feature, but it can also be a vector if
the hook itself is compromised or behaves unexpectedly.

**Fix.** Surface what each hook does in a comment in the settings file. For teams
that want predictable behavior, consider a `ConfigChange` hook pattern that
requires sign-off before hooks change.

---

### `additional-dirs-broad`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | permissions |
| **detect** | `[script]` `additionalDirectories` containing `~`, `/`, or other broad paths |

**Why it matters.** `additionalDirectories` expands the directories Claude can
read and modify beyond the project root. Adding `~` or `/` effectively grants
access to your entire filesystem.

**Fix.** Narrow to the specific directories that are actually needed for the
project (e.g. `~/my-data-exports` rather than `~`).

---

### `no-secret-deny-rules`

| Field | Value |
|---|---|
| **sev** | high |
| **dim** | permissions |
| **detect** | `[script]` no `Read` deny rule covering `.env`, common secret file patterns, or SSH paths |

**Why it matters.** Without explicit deny rules, Claude's file tools can open any
file in the project that isn't otherwise blocked. The absence of deny rules is
only flagged as high severity when the correlation check finds actual secrets in
the project. If no secrets are present, this is surfaced as a "worth adding now
before you put secrets here" recommendation.

**Honest limit.** `Read` deny rules cover Claude's file tools and shell commands
routed through Claude's tool layer (including `cat`, `sed`, `awk`, and similar
commands Claude might run). They do **not** stop an arbitrary script that you or
Claude runs via `Bash` if that script directly calls the OS to read the file.
Only the sandbox provides OS-level enforcement.

**Fix.** Add the canonical deny block (see `secret-in-readable-file` above, or
the full block repeated here for convenience):

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

---

### `sandbox-off`

| Field | Value |
|---|---|
| **sev** | info |
| **dim** | permissions |
| **detect** | `[script]` sandbox not enabled in settings |

**Why it matters.** The sandbox runs Claude in an OS-level container. It is the
only control that provides airtight enforcement — it blocks file reads, network
calls, and subprocess access at the OS level, regardless of what permission rules
say. `Read` deny rules and permission allow/deny lists are enforced by Claude
Code; the sandbox is enforced by the operating system.

**When to raise urgency.** If the correlation check has found a reachable secret
and broad Bash access is enabled, flag this as "the airtight fix" and offer to
set it up. If there is nothing sensitive in the project, note it as "worth
knowing if that changes" and don't make it alarming.

**Fix.** Enable the sandbox via Claude Code's `/sandbox` command or by setting it
in your project's settings. Note that the sandbox may restrict some workflows
(e.g. tools that need internet access) — evaluate per project.

---

## Correlation — dimension `exposure`

### `reachable-secret`

| Field | Value |
|---|---|
| **sev** | critical |
| **dim** | exposure |
| **detect** | `[script]` a `secret-in-readable-file` or `sensitive-*` finding joined against the `config` module's effective permission picture: no `Read` deny covers the file, AND `Bash` or broad tool access is enabled |

**Why it matters.** This is the headline finding — the cross-module join that
neither gitleaks nor a human skim can produce. A secret only becomes an active
risk when Claude can actually reach it given the current permission configuration.

**What the finding says:**
> "`config/old.js` contains an AWS key (entropy 4.3). Your settings have no
> `Read` deny rule covering it, and `Bash` is broadly allowed — so Claude, a
> subagent, or a prompt injection can read and exfiltrate it. One-line fix below."

**Fix.** The combined fix: add the `Read` deny rule for the specific file path,
remove or scope the broad Bash allow, and rotate the key. Optionally enable the
sandbox for OS-level enforcement.

**The `reachable` field in the finding JSON** is set to `true` by the correlation
pass, and `false` for secrets that are already covered by a deny rule. This drives
the wording of the fix: a covered secret gets "well-shielded already, just rotate
it as a precaution" rather than urgent remediation.

---

## D. Privacy & data posture — dimension `privacy`

These are informational findings. They don't indicate a misconfiguration — they
surface facts about Claude Code's data handling that you might want to act on.

---

### `consumer-training-on`

| Field | Value |
|---|---|
| **sev** | info |
| **dim** | privacy |
| **detect** | `[judgment]` plan tier appears to be Free, Pro, or Max (consumer plans) |

**Why it matters.** On consumer plans, conversations and code may be used to
train Anthropic's models, with a 5-year retention period. This is not a
misconfiguration — it is the terms of the plan. The finding surfaces it so you
can make an informed choice.

**Fix.** If this is a concern, visit `claude.ai/settings/data-privacy-controls`
to review your current data-privacy settings. Claude for Work (Teams/Enterprise)
plans have different defaults.

---

### `local-transcripts`

| Field | Value |
|---|---|
| **sev** | info |
| **dim** | privacy |
| **detect** | `[script]` plaintext conversation transcripts found in `~/.claude/projects/` |

**Why it matters.** Claude Code stores conversation history locally as plaintext
by default for 30 days. If your conversations include sensitive file contents,
those are in the transcript.

**Fix.** Adjust `cleanupPeriodDays` in your user settings to a shorter window for
sensitive work.

---

### `telemetry-state`

| Field | Value |
|---|---|
| **sev** | info |
| **dim** | privacy |
| **detect** | `[script]` state of environment variables: `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `DISABLE_FEEDBACK_COMMAND`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` |

**Why it matters.** Telemetry excludes code and file paths. The `/feedback`
command, however, does include code snippets when submitted. This finding
surfaces the current state so you can opt out of what you don't want.

**Fix.** Set the relevant environment variables in your shell profile if you want
to opt out. See the Claude Code settings documentation for the exact variable
names.

---

## E. Context hygiene — dimension `context`

These findings affect how well Claude understands and stays focused on your
project, rather than your security posture.

---

### `no-claude-md`

| Field | Value |
|---|---|
| **sev** | medium |
| **dim** | context |
| **detect** | `[script]` no `CLAUDE.md` file found in the project root |

**Why it matters.** `CLAUDE.md` is the primary way to give Claude persistent
context about your project — what it is, what conventions to follow, what's
off-limits. Without it, Claude has no project-specific grounding and will rely
entirely on what you type in each conversation.

**Fix.** Run `/fantasia-safety-setup` to generate a right-sized `CLAUDE.md` from
plain-English answers about your project.

---

### `claude-md-bloated`

| Field | Value |
|---|---|
| **sev** | low |
| **dim** | context |
| **detect** | `[script]` `CLAUDE.md` is very large, or many files are auto-loaded via `@import` directives |

**Why it matters.** Every auto-loaded file consumes context window tokens on
every conversation. Too much auto-loaded context crowds out the actual task,
leading to "it gets confused" failures and higher costs.

**Fix.** Trim `CLAUDE.md` to the essentials. Move reference material to
on-demand files that Claude fetches only when needed, rather than auto-loading
everything.

---

### `claude-md-conflicts`

| Field | Value |
|---|---|
| **sev** | low |
| **dim** | context |
| **detect** | `[script]` conflicting instructions across nested `CLAUDE.md` files, or duplicated content between `CLAUDE.md` and `AGENTS.md` |

**Why it matters.** Conflicting instructions in nested config files can cause
unpredictable behavior — Claude follows the most specific file, but conflicts
between a root and a subdirectory `CLAUDE.md` often indicate confusion rather
than intent.

**Fix.** Reconcile the files. Keep the root `CLAUDE.md` for project-wide
conventions and use subdirectory files only for genuinely scoped overrides.

---

## F. Leverage — dimension `leverage`

These findings are opportunities, not problems. They surface patterns where the
user could get more value from Claude Code without any additional risk.

---

### `repeated-prompt`

| Field | Value |
|---|---|
| **sev** | info |
| **dim** | leverage |
| **detect** | `[judgment]` same or very similar prompt appears to be used repeatedly (e.g. in CLAUDE.md comments or conversation history) |

**Why it matters.** If you are typing the same instruction repeatedly, that
instruction should be a skill (a saved, reusable piece of context and
instructions). Repeated prompts are the folklore that skills replace.

**Fix.** "This looks like something that should be a skill. Want me to help you
set one up?"

---

### `unused-capability`

| Field | Value |
|---|---|
| **sev** | info |
| **dim** | leverage |
| **detect** | `[judgment]` no skills, subagents, or memory patterns in use despite a project that could benefit from them |

**Why it matters.** Claude Code's highest-value features (skills for reusable
workflows, subagents for parallel work, persistent memory via CLAUDE.md) require
explicit setup. Many users get 20% of the value by using only the chat interface.

**Fix.** Surface the single most applicable capability for this project. "Based
on what I see here, the next thing to add would be X."

---

### `ready-for-structure`

| Field | Value |
|---|---|
| **sev** | info |
| **dim** | leverage |
| **detect** | `[judgment]` project appears complex enough (many files, multiple domains, evidence of coordination overhead) to benefit from a routing pattern or STATUS.md |

**Why it matters.** As projects grow, Claude loses track of what's happening
without explicit structure. A STATUS.md (a lightweight "context OS") and a
CLAUDE.md routing pattern dramatically reduce the "you forgot what we were doing"
failures.

**Fix.** Offer the smallest next step: a STATUS.md template, or a routing
section in CLAUDE.md. Don't prescribe a full system upfront.

---

## Finding schema reference

Every finding emitted by `fantasia-scan` follows this structure:

```jsonc
{
  "id": "exposed-secret-aws",
  "dimension": "exposure",          // exposure | permissions | privacy | context | leverage
  "severity": "critical",           // critical | high | medium | low | info
  "file": "config/old.js",
  "line": 14,
  "redactedMatch": "AKIA••••••••••••",  // never the real value; omitted for non-secret findings
  "evidence": "matched rule `aws-access-key` (regex + entropy 4.3)",  // always present
  "why": "An AWS key here can be read by Claude and anything it runs.",
  "fix": "Move to an env var; add Read deny for *.env; rotate this key.",
  "reachable": true,                // set by correlation pass; drives urgency wording
  "fingerprint": "config/old.js:exposed-secret-aws:14"  // stable key for .fantasiaignore
}
```

`evidence` is always one of:
- `"filename matches X"` (for file-pattern checks)
- `"regex rule Y + entropy Z"` (for secret checks)
- `"keyword 'diagnosis' near 'patient'"` (for sensitive-data checks)
- `"settings.json permissions.allow contains Bash(*)"` (for config checks)
