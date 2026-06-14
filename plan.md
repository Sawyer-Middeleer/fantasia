# fantasia — Plan

> One day the sorcerer's apprentice got bored of doing his chores.
>
> The apprentice didn't flood the room because the magic was weak. He flooded it
> because he never understood the *boundaries* of the magic. **fantasia is the
> check that keeps the brooms in their lane** — a runnable checkup for your
> Claude Code setup that tells you, in plain English, where you're leaky, where
> you're exposed, and where you're leaving magic on the table — and fixes each
> one with your OK.

---

## 1. What it is

A **Claude Code plugin** (installable in Claude Code *and* Cowork) for people
**early in their journey** automating knowledge work with agents — especially
the non‑technical. It does three things:

1. **Audit + fix** — a deterministic, privacy‑safe scan of your config and files
   that scores your setup, explains every finding, and fixes issues one approved
   step at a time.
2. **Setup** — an interview that generates a safe, sensible starting config
   (CLAUDE.md, permission rules, ignore rules) from plain‑English answers.
3. **Ask** — plain‑English Q&A that translates the Claude Code docs, seeded by
   the actual questions real users ask, and personalized to *your* setup.

### Who it's for
The person from the workshop: sees the value of agents but finds the advanced
stuff ("loops," "knowledge graphs," "context OS") out of reach, *or* tries to
build automations and hits complexity/safety walls. Scared of what the agent can
touch. Lives in the Desktop app / Cowork as often as the terminal.

---

## 2. The problem (evidence)

From a 250‑person Claude Code workshop chat, the pains cluster hard. The single
loudest theme is **not "how do I build automations" — it's "what can this thing
touch, and how do I stop it."**

- **Access / secrets / blast‑radius fear** (the dominant cluster):
  *"Claude having access to things I don't want it to access to accidentally,
  without me knowing, is really troubling. How can we avoid this? (incl.
  passwords!)"* · *"What settings safeguard files I don't want Claude to access?"*
  · *"How can we restrict Claude to not see passwords?"* · *"Isn't it a privacy
  issue when Claude can read your files and emails?"*
  - Tell: one attendee hand‑wrote a 120‑word safety prompt ("Never touch my
    passwords, API keys, or .env files…") and others copied it like scripture. A
    population manually reinventing a guardrail no tool gives them.
- **Config confusion** — the very files an audit reads: *"claude.md vs
  agents.md?"* · *"do I need a claude.md in every folder?"* · *"can you help me
  write settings.json?"* · *"what settings give you that comfort to run on auto?"*
- **"It feels out of reach / I'll hit a wall"** — *"how much did you eventually
  need fixed by a developer?"* · a working Gmail automation that breaks the
  moment they try to extend it.

fantasia turns the folklore people trade in chat into a **runnable, scored,
self‑explaining check.**

---

## 3. Positioning

- **Not deterministic automation.** n8n owns that; Claude Code **Dynamic
  Workflows** now spin up to 1,000 subagents to *run* big jobs. fantasia doesn't
  run automations — **it audits the environment automations run in.** It sits a
  layer *below* both. (1,000 subagents per prompt makes "what's my blast radius?"
  *more* urgent, not less.)
- **Not a vertical skill pack.** `claude-for-legal` is a pack of *doing* skills.
  fantasia is a **horizontal meta‑plugin** that audits any setup — plausibly the
  plugin people install *first*.
- **Same machinery as the official plugins**: markdown skills + JSON manifests,
  no build step, marketplace‑installable, a `cold-start-interview` pattern, an
  optional deterministic binary.

---

## 4. Core principles

1. **The scanner is the privacy firewall.** A regex/entropy engine reading a
   password is not a risk — it's a dumb byte‑matcher, not an intelligence that
   can remember or exfiltrate. The risk is *Claude* reading the secret into
   context. So: **the script reads bytes; Claude only ever reads redacted,
   structured findings; Claude never opens a flagged file.** (Modeled on
   gitleaks' default `--redact 100`.)
2. **Disclose before acting.** Every scan and every fix is preceded by a clear,
   specific statement of what will happen, what is and isn't accessed, and waits
   for consent. (See §9.)
3. **Show your work (provenance).** Every finding carries an `evidence` field —
   *how it was detected* — so the user can judge and dismiss. No black‑box
   findings, ever.
4. **Honest, but plain and contextual — never abstract or alarming.** Every
   caveat is (a) in plain language ("a script that you or I run," not "a
   subprocess"), (b) grounded in what the scan actually found in *this* project,
   and (c) explicit about whether it matters *right now*. The pattern:
   > "X doesn't fully cover Y — which **matters here because** ⟨grounded reason⟩"
   > *or* "…which **isn't a concern right now because** ⟨grounded reason⟩ — just
   > worth knowing if that changes."

   Worked example (the deny‑rule limit), branch chosen by whether a real secret
   was found — this is the correlation from §5.3 driving the *wording*:
   - *Exposure found:* "Adding a deny rule stops me from opening `config/old.js`
     directly. It won't stop a script that you or I run in this project from
     reading it — and that **matters here, because that file has a live key in
     it.** The airtight fix is turning on the sandbox; want me to set that up
     too?"
   - *No exposure:* "A deny rule stops me from opening that file directly. A
     script we run could still read it — **not something to worry about right
     now, since there's nothing sensitive there** — just worth knowing if that
     changes."

   Never surface a limitation in the abstract. If it doesn't apply to their
   setup, say so plainly or don't raise it. Accuracy over reassurance, but
   calibrated to their reality, never alarming for its own sake.
5. **Plain English, define every term.** Written for someone who will never
   `cd`. Works in Cowork, not just the terminal.
6. **Read‑only by default; every change gated on approval.** fantasia models the
   exact careful behavior it preaches.
7. **Zero install friction.** The scanner is zero‑dependency Node (Claude Code
   already ships Node). Optionally shells out to real `gitleaks` if present for a
   deeper secret scan.

---

## 5. Architecture

```
fantasia/
├── .claude-plugin/
│   ├── plugin.json              # name "fantasia", version, author, license
│   └── marketplace.json         # repo is its own installable marketplace
├── skills/
│   ├── fantasia-safety-check/SKILL.md   # /fantasia-safety-check — scan → score → fix   (PIECE 1)
│   ├── fantasia-safety-setup/SKILL.md   # /fantasia-safety-setup — interview → configs  (PIECE 2)
│   └── fantasia-ask/SKILL.md            # /fantasia-ask — plain-English Q&A             (PIECE 3)
├── bin/
│   └── fantasia-scan            # zero-dep Node; emits redacted JSON findings (on PATH when enabled)
├── references/                  # SHARED knowledge — single source of truth
│   ├── checks.md                # the check catalog (audit + setup read this)
│   ├── standards.md             # "what good looks like" (audit + setup share it)
│   ├── concerns.md              # workshop pain taxonomy → plain answers (ask + audit)
│   ├── rules/
│   │   ├── secrets.json         # gitleaks-style secret rule pack (community-extensible)
│   │   ├── sensitive.json       # financial / medical / legal / PII keyword packs
│   │   └── settings-checks.json # loose-permission checks, doc-grounded
│   └── docs/                    # distilled plain-English Claude Code doc pack (ask)
├── templates/
│   ├── claudeignore.template
│   ├── CLAUDE.md.template
│   └── settings.{careful,balanced,fast}.json   # permission presets by caution level
├── scripts/refresh-docs.mjs     # rebuild references/docs from code.claude.com/docs/llms.txt
├── README.md  QUICKSTART.md  LICENSE  plan.md
```

Each piece is a **skill** (not a legacy `command`), so each is both
user‑invocable (`/fantasia-safety-check`) *and* model‑invocable — when someone types
"can Claude see my passwords?", `ask`/`audit` auto‑fires. Descriptions are
written tightly so auto‑fire helps rather than nags.

### 5.1 The scanner (`bin/fantasia-scan`)

Deterministic Node script, three modules, one redacted JSON findings array out.
**It does the reading so Claude doesn't have to.**

| Module | Reads | Detects | Output (always redacted) |
|---|---|---|---|
| `config` | `.claude/settings*.json` (all scopes), `~/.claude/settings.json`, `.mcp.json`, hooks, `CLAUDE.md`/`AGENTS.md`/`.claude/rules/`, `.claudeignore`, `.gitignore`, managed settings (report‑only) | loose permission rules, risky modes, MCP/hook inventory, context‑hygiene signals; **redacts any secret value found inside a settings file** | rule + source file + line + `evidence` + fix |
| `secrets` | project file bytes (skips binaries, large files, `node_modules`, `.git`, ignored paths) | API keys, tokens, private keys, passwords — regex + Shannon entropy + keyword prefilter | rule id + `file:line` + `redactedMatch` (`AKIA••••`) + entropy + `evidence` |
| `sensitive` | same walk | files containing **non‑credential** sensitive data — financial / medical / legal / PII keyword+pattern packs | category + filename + redacted snippet + `evidence` |

It reconciles settings across the documented precedence (managed > CLI > local
project > shared project > user) and attributes each finding to its source file,
the way `/permissions` does.

### 5.2 Finding schema (modeled on gitleaks' JSON report)

```jsonc
{
  "id": "exposed-secret-aws",
  "dimension": "exposure",            // exposure | permissions | privacy | context | leverage
  "severity": "critical",             // critical | high | medium | low | info
  "file": "config/old.js", "line": 14,
  "redactedMatch": "AKIA••••••••••••",   // never the real value
  "evidence": "matched rule `aws-access-key` (regex + entropy 4.3)",  // ← how it knows
  "why": "An AWS key here can be read by Claude and anything it runs.",
  "fix": "Move to an env var; add Read deny for *.env; rotate this key.",
  "reachable": true,                  // ← correlation: is it reachable given the permission config?
  "fingerprint": "config/old.js:exposed-secret-aws:14"
}
```

`evidence` is always one of: *"filename matches X" · "regex rule Y + entropy Z" ·
"keyword 'diagnosis' near 'patient'" · "settings.json `permissions.allow`
contains `Bash(*)`"*.

### 5.3 The correlation (the headline feature)

A secret or sensitive file only *matters* if Claude can reach it. The scanner
joins the `secrets`/`sensitive` findings against the `config` module's effective
permission picture and emits **exposure** findings:

> *"`config/old.js` contains an AWS key (entropy 4.3). Your settings have **no
> `Read` deny rule** covering it, and `Bash` is broadly allowed — so Claude, a
> subagent, or a prompt injection can read and exfiltrate it. One‑line fix
> below."*

This cross‑module join is the differentiated output gitleaks can't produce and a
human skim can't either.

### 5.4 False positives & re‑runs (from gitleaks)

- `.fantasiaignore` — fingerprints (`path:rule:line`) to dismiss, surfaced as a
  plain‑English "mark this as fine" choice during the fix loop.
- **Baseline** — "accept current state," so re‑runs only flag *new* issues.
  Powers the score‑over‑time UX.

---

## 6. The three pieces

### Piece 1 — Audit + fix loop (`/fantasia-safety-check`)
**Flow:** disclose & get consent (§9) → run `fantasia-scan` → it emits redacted
JSON → skill renders a scored, plain‑English report incl. the **blast‑radius
map** and **exposure correlations** → interactive **fix loop**: one finding at a
time — show what / why / how‑it‑knows / proposed change (as a diff) → apply only
on approval → re‑scan to confirm. Writes `FANTASIA-REPORT.md`.

**SKILL.md hard rules:** disclose‑then‑consent before running · operate **only**
on the scanner's redacted JSON · **never** Read/Grep a flagged file · every
finding shows `evidence` · never echo a secret value · state honestly when a
control isn't airtight.

### Piece 2 — Interview setup (`/fantasia-safety-setup`)
A jargon‑free `cold-start-interview`: *what is this project / what do you want
help with / what's sensitive and off‑limits / which accounts & tools / how
cautious should Claude be?* Generates from the answers:
- a right‑sized **CLAUDE.md** (identity, conventions, routing if needed),
- **`permissions.deny` Read rules** fencing off secrets/sensitive paths (the
  *documented* control — corrects the `.claudeignore`‑only folklore), plus
  `.claudeignore`/gitignore additions,
- a **settings.json** from a caution preset (`careful`/`balanced`/`fast`) — turns
  the hand‑written 120‑word safety prompt into actual *enforced* config,
- optionally a light **STATUS.md / folder structure** ("context‑OS lite").

Then it **immediately runs `/fantasia-safety-check`** so they watch their score go
green. Setup and audit read the same `references/standards.md`, so they can't
drift.

### Piece 3 — Plain‑English Q&A (`/fantasia-ask`)
**Concern‑first, not topic‑first.** Seeded with the workshop pain taxonomy in
`references/concerns.md` mapping *real phrasings* → plain answers: "can Claude
see my passwords?", "git vs GitHub?", "what's MCP?", "I ran out of tokens",
"claude.md vs agents.md", "which model when?".

**Grounding:** a distilled plain‑English pack in `references/docs/` built *from*
`code.claude.com/docs` (organized by concern, not doc tree), answered from
first; **live WebFetch fallback** for anything uncovered; `scripts/refresh-docs.mjs`
rebuilds the pack from the docs' `llms.txt` index. **Differentiator over reading
the docs:** `ask` can read your actual config and answer *in your case* — "you
have an `.mcp.json` with Gmail, so yes, Claude can draft emails as you; here's
how to scope that down."

---

## 7. Audit check catalog (doc‑grounded)

Organized by the three user‑named concern dimensions, plus correlation, plus the
setup‑quality dimensions. Every check cites the Claude Code behavior it's based
on. `[script]` = deterministic; `[judgment]` = model assesses.

### A. Credentials & secrets  — dimension `exposure`
| id | sev | detect | fix |
|---|---|---|---|
| `secret-in-readable-file` | critical | `[script]` regex+entropy+keyword, redacted | move to env var; add `Read` deny; **rotate** |
| `private-key-present` | critical | `[script]` PEM/`id_rsa`/`*.pem` patterns | relocate outside project or deny‑read; rotate |
| `secret-in-settings` | critical | `[script]` secret value inside a `settings*.json`/`.mcp.json` | move to env var / `apiKeyHelper`; never commit |
| `credentials-file-exposed` | high | `[script]` `~/.claude/.credentials.json` world/group‑readable or in a synced folder | restore `0600`; move out of synced dirs |

### B. Non‑credential sensitive data  — dimension `exposure`
| id | sev | detect | fix |
|---|---|---|---|
| `sensitive-financial` | high | `[script]` keywords/patterns: `invoice`, routing/SSN/card patterns, `*tax*.{xlsx,pdf}`, `salary` | fence off via `Read` deny + `.claudeignore`; move out of project |
| `sensitive-medical` | high | `[script]` `diagnosis`, `patient`, `prescription`, `DOB` near names | same |
| `sensitive-legal-pii` | medium | `[script]` `confidential`, `settlement`, `passport`, address‑near‑name | same |

> Novel vs gitleaks: gitleaks finds *secrets*; fantasia also flags *sensitive
> context* an agent (or a 1,000‑subagent swarm) shouldn't be reading.

### C. Loose security settings  — dimension `permissions`
All grounded in the permissions/security docs.
| id | sev | detect | fix |
|---|---|---|---|
| `mode-bypass-permissions` | critical | `[script]` `defaultMode: "bypassPermissions"` outside a container/VM | revert to `default`; optionally set `permissions.disableBypassPermissionsMode: "disable"` (doc: skips prompts even for `.git`/`.claude` writes; "only use in isolated environments") |
| `mode-auto` | high | `[script]` `defaultMode: "auto"` | reconsider (research‑preview auto‑approve); `disableAutoMode: "disable"` to lock out |
| `mode-accept-edits-persisted` | medium | `[script]` `acceptEdits` as persisted default | scope to sessions; it auto‑accepts `rm`/`mv`/`cp` in‑workdir |
| `bash-wide-open` | high | `[script]` bare `Bash` or `Bash(*)` in `allow` | remove; rely on per‑command approval / specific allow rules (doc: bare allow drops the whole‑tool prompt) |
| `network-bash-allowed` | high | `[script]` `Bash(curl *)` / `Bash(wget *)` in `allow` | move to `deny`; use `WebFetch(domain:…)` allowlist (doc: curl/wget deliberately **not** auto‑approved — exfil/prompt‑injection vector) |
| `fragile-arg-rule` | medium | `[script]` arg‑constraining bash rule e.g. `Bash(curl http://x/ *)` | false sense of security — bypassable via flags/https/redirects/vars; use deny + WebFetch or a PreToolUse hook |
| `env-runner-allowed` | high | `[script]` `Bash(npx *)`, `Bash(docker exec *)`, `Bash(devbox run *)` | effectively `Bash(*)`; replace with specific inner‑command rules |
| `webfetch-all-domains` | medium | `[script]` bare `WebFetch` allow | restrict to `WebFetch(domain:…)` |
| `webfetch-preflight-off` | medium | `[script]` `skipWebFetchPreflight: true` | you lose Anthropic's malicious‑domain blocklist; re‑enable or pair with domain rules |
| `mcp-wide-open` | high | `[script]` `mcp__*` allow, or write‑capable MCP tools auto‑allowed | scope per server/tool; doc: Anthropic does **not** security‑audit MCP servers |
| `mcp-write-capable` | medium | `[script]` inventory connectors that can send email / move money / delete | confirm intent; least privilege; require trust verification |
| `opaque-hook` | medium | `[script]` PreToolUse/PostToolUse hook running shell | surface what it runs (a hook runs on tool calls); recommend `ConfigChange` hook for cautious teams |
| `additional-dirs-broad` | medium | `[script]` `additionalDirectories` incl. `~`, `/`, broad paths | narrow scope |
| `no-secret-deny-rules` | high | `[script]` no `Read` deny covering `.env`/secrets/ssh | add the deny snippet below. Explain its limit per §4: a deny rule stops me opening the file, but a script we run could still read it — surfaced as *important* only when a real secret is present, otherwise noted as "not a concern yet" |
| `sandbox-off` | info | `[script]` sandbox not enabled | suggest `/sandbox` for airtight, OS‑level protection — framed as *important* when there's a real exposure, otherwise just "worth knowing" (see §4) |

**Canonical secret‑fencing fix (documented syntax):**
```json
{ "permissions": { "deny": [
  "Read(./.env)", "Read(**/.env)", "Read(**/.env.*)",
  "Read(**/*.pem)", "Read(**/id_rsa)", "Read(~/.ssh/**)", "Read(./secrets/**)"
] } }
```

### Correlation  — dimension `exposure`
| id | sev | detect | fix |
|---|---|---|---|
| `reachable-secret` | critical | `[script]` a secret/sensitive finding **not** covered by a `Read` deny, with `Bash`/broad access enabled | the one‑line combined fix; this is the headline finding |

### D. Privacy & data posture  — dimension `privacy` (mostly informational)
| id | sev | detect | fix |
|---|---|---|---|
| `consumer-training-on` | info | `[judgment]` plan is Free/Pro/Max | inform: data (incl. code) may train models, 5‑yr retention; link `claude.ai/settings/data-privacy-controls` |
| `local-transcripts` | info | `[script]` plaintext transcripts in `~/.claude/projects/` (30d default) | adjust `cleanupPeriodDays` for sensitive work |
| `telemetry-state` | info | `[script]` state of `DISABLE_TELEMETRY` / `DISABLE_ERROR_REPORTING` / `DISABLE_FEEDBACK_COMMAND` / `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | surface + how to opt out (telemetry excludes code/paths; `/feedback` includes code) |

### E. Context hygiene  — dimension `context`
| id | sev | detect | fix |
|---|---|---|---|
| `no-claude-md` | medium | `[script]` no CLAUDE.md | offer to generate one (via setup) |
| `claude-md-bloated` | low | `[script]` oversized / many auto‑loaded files | trim; token waste → "it gets confused" failures |
| `claude-md-conflicts` | low | `[script]` conflicting nested CLAUDE.md, or CLAUDE.md vs AGENTS.md duplication | reconcile |

### F. Leverage  — dimension `leverage`
| id | sev | detect | fix |
|---|---|---|---|
| `repeated-prompt` | info | `[judgment]` same prompt pasted repeatedly | "this should be a skill" |
| `unused-capability` | info | `[judgment]` no skills/subagents/memory in use | "add this one first" |
| `ready-for-structure` | info | `[judgment]` project complex enough for a routing/STATUS.md pattern | smallest next step |

---

## 8. Scoring

- One overall **0–100** plus per‑dimension grades, visually grouped:
  **Safety** (exposure + permissions + privacy) vs **Setup quality** (context +
  leverage). Critical findings cap the Safety score until resolved.
- Shareable ("47 → 92 after fixes"), virality/demo‑friendly, but always shown
  *with* the findings list so it's never reductive.
- Baseline support so re‑runs show movement.

---

## 9. The disclosure (polished)

Shown before any scan, then waits for consent. Accurate to how the scanner
actually works.

```
fantasia is about to run a LOCAL checkup. Here is exactly what happens —
nothing runs until you say go.

WHAT RUNS
  • `fantasia-scan`, a script on your machine. It runs fully offline.
    It makes no network calls and sends nothing anywhere.

WHAT IT READS (locally)
  • Your Claude config: .claude/settings files, .mcp.json, hooks,
    CLAUDE.md / AGENTS.md, ignore files — and your user-level ~/.claude settings.
  • Your project files, to look for exposed secrets and sensitive data.
    It skips node_modules, .git, binaries, and anything already ignored.

WHAT IT LOOKS FOR
  • Loose security settings (e.g. broad command access, the ability to read .env).
  • Passwords, API keys, and private keys sitting in readable files.
  • Files containing financial / medical / personal information.
  • Whether any of the above is actually REACHABLE by Claude given your settings.

WHAT IT WILL NOT DO
  • It will NOT open your file contents into this chat.
  • It will NOT read the VALUE of any password or key — those are redacted
    (you'll see `AKIA••••`, never the real thing).
  • It will NOT change anything. Fixes happen later, one at a time, only with
    your approval.
  • It will NOT look outside this project folder and your Claude config.

THE GUARANTEE
  • The script reads the bytes. I (Claude) only ever see REDACTED findings —
    so I never see your secrets.
  • Every finding will show HOW it was detected, so you can judge it yourself.

Run the checkup?   [ yes  /  no  /  show me the rules first ]
```

The report then carries **two** access statements: (a) *what Claude can reach*
(blast‑radius map), and (b) *what the audit itself touched* — e.g. "scanned 142
files under `./`; read 0 file contents into this conversation; skipped
`node_modules`, `.git`; never traversed above the project root." The same
disclose‑then‑consent discipline gates every fix.

---

## 10. Shared knowledge substrate

`references/checks.md`, `standards.md`, `concerns.md`, `rules/*.json`, and
`docs/` are the single sources of truth all three pieces draw from. Add a check
once → **audit flags it, setup prevents it, ask explains it.** This is also the
**OSS contribution surface**: the community adds checks, rules, and plain‑English
answers — not code.

---

## 11. Distribution

- The repo is its own marketplace (`.claude-plugin/marketplace.json`).
- Install: `/plugin marketplace add Sawyer-Middeleer/fantasia` →
  `/plugin install fantasia@fantasia`.
- Dev/test: `claude --plugin-dir ./fantasia`, iterate with `/reload-plugins`,
  validate with `claude plugin validate` before release.
- Later: submit to the `claude-community` marketplace.

---

## 12. Build milestones

- **M0 — Scaffold:** structure + `plugin.json` + `marketplace.json` + README;
  loads via `--plugin-dir`. *(safe, reversible — do first)*
- **M1 — Audit MVP (the differentiated core):** `fantasia-scan` with all three
  modules (`config`, `secrets`, `sensitive`) + redaction + the **correlation**
  pass + disclosure/consent + provenance + the fix loop. Covers dimensions A, B,
  C, correlation. Ships value alone.
- **M2:** privacy/data + context + leverage checks; scoring + `FANTASIA-REPORT.md`
  + baseline/`.fantasiaignore`.
- **M3:** `/fantasia-safety-setup` interview → configs → auto‑audit.
- **M4:** `/fantasia-ask` with concern index + distilled doc pack + live fallback.
- **M5:** polish, score badge, `claude plugin validate`, publish marketplace,
  submit to community.

---

## 13. Open decisions

1. **Scanner:** ship‑our‑own zero‑dep Node baseline, optional `gitleaks` deep
   scan if present. *(recommended)*
2. **Command names:** `/fantasia-safety-check` · `:setup` · `:ask` — or friendlier
   `:checkup` · `:getting-started` · `:explain`?
3. **Score:** single 0–100 + per‑dimension grades. *(recommended)*
4. **Q&A grounding:** bundled distilled pack + live fallback. *(recommended)*
5. **Target surface:** Code‑first, output designed Cowork‑friendly (no `cd`/flags
   required). *(recommended)*

---

## 14. References

- Plugins: https://code.claude.com/docs/en/plugins · README:
  https://github.com/anthropics/claude-code/blob/main/plugins/README.md
- Permissions: https://code.claude.com/docs/en/permissions ·
  Modes: https://code.claude.com/docs/en/permission-modes
- Security: https://code.claude.com/docs/en/security
- Data usage / privacy: https://code.claude.com/docs/en/data-usage
- Sandboxing: https://code.claude.com/docs/en/sandboxing
- Settings: https://code.claude.com/docs/en/settings
- gitleaks: https://github.com/gitleaks/gitleaks · rules:
  https://deepwiki.com/gitleaks/gitleaks/4-rule-system
- Reference plugin (structure): https://github.com/anthropics/claude-for-legal
- Dynamic Workflows (positioning): https://www.infoq.com/news/2026/06/dynamic-workflows-claude-code/
```
