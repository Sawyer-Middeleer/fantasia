# Git, GitHub, and setup

**Sources:**
- https://code.claude.com/docs/en/quickstart

---

## Git vs GitHub — the actual difference

This confuses almost everyone at first.

**Git** is a tool that runs on your computer. It tracks changes to files over
time. When you "commit" something, you're saving a snapshot of your files in
git's history. Git itself is entirely local — it doesn't talk to the internet.

**GitHub** is a website where you can put a copy of your git history in the
cloud. It adds things like pull requests, issues, and a web interface for
viewing code. GitHub is one of several services that host git repositories
online (others include GitLab and Bitbucket).

So: git is the tool; GitHub is one place you can store and share what git
tracks.

**For Claude Code specifically:** Claude Code uses git to understand your
project — which files changed, the project history, what branch you're on.
It doesn't require GitHub. You can use Claude Code with a project that's only
in git locally and has never been pushed to GitHub.

When Claude says "commit your changes," it means saving a snapshot in git
(local). When it says "push to origin," it means sending those commits to
wherever your remote repository is — which might be GitHub, GitLab, or
something else.

---

## Terminal vs Desktop app — which do I use?

Claude Code runs in several places:

**Terminal / command line:** The original interface. You type `claude` in
your terminal, and you get a text-based chat. This is what the quickstart
guides cover. It has access to all of Claude Code's features.

**Desktop app:** A graphical interface for Claude Code. Available on macOS
and Windows. Less typing, same underlying capabilities. Good if the terminal
feels uncomfortable.

**VS Code / JetBrains IDEs:** Claude Code integrates directly into these
code editors. Good if you already work in one of them.

**Web (claude.ai/code):** Claude Code in your browser. Some features work
differently here (for example, `bypassPermissions` mode isn't available,
and the file system works through a cloud VM).

**You don't have to choose one permanently.** Many people use the terminal
for full control and the Desktop app when they want something simpler. They
read the same settings files and project configuration.

---

## Installing Claude Code

**On macOS or Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**On Windows (PowerShell):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**On Windows (CMD):**
```
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

You can also install via Homebrew (`brew install --cask claude-code`) on
macOS, or WinGet (`winget install Anthropic.ClaudeCode`) on Windows.

**Note for Windows:** Claude Code works best with Git for Windows installed
(git-scm.com/downloads/win), because it uses the Bash tool. Without it,
Claude Code falls back to PowerShell as the shell.

After installing, native installs update automatically in the background.
Homebrew and WinGet installations don't auto-update — run
`brew upgrade claude-code` or `winget upgrade Anthropic.ClaudeCode` to
get the latest version.

---

## First login

After installing, start Claude Code by typing `claude` in your terminal.
On first run, it will prompt you to log in. You'll authenticate through
your browser.

You can log in with:
- A Claude subscription (Pro, Max, Team, or Enterprise) — recommended
- A Claude Console account (pay-per-token API access)
- Amazon Bedrock, Google Cloud Vertex AI, or Microsoft Foundry (enterprise
  cloud providers)

Your login is stored on your system — you won't need to log in again. To
switch accounts, type `/login` inside a running session.

---

## Starting your first session

Open your terminal in your project folder and type `claude`. That's it.

```
cd /path/to/your/project
claude
```

Claude Code reads your project files as needed — you don't manually add
context. Just describe what you want in plain English.

Common first things to try:
- "What does this project do?" — Claude reads the files and summarizes
- "What files have I changed?" — Claude checks git status
- "Run the tests and tell me what's failing" — Claude runs your test command

Use `/help` to see available commands. Use `Shift+Tab` to cycle through
permission modes. Use `/permissions` to see what's currently allowed and
denied.

---

## Useful session commands

| Command | What it does |
|---|---|
| `/help` | Show available commands |
| `/clear` | Start a fresh conversation (keeps your settings) |
| `/permissions` | View current allow/deny rules |
| `/model` | Change the Claude model |
| `/memory` | See which CLAUDE.md files are loaded |
| `/usage` | Check token usage for this session |
| `/exit` or Ctrl+D | Exit Claude Code |

Shell commands (run in your terminal, not inside Claude Code):

| Command | What it does |
|---|---|
| `claude` | Start a new session |
| `claude -c` | Continue the most recent conversation |
| `claude -r` | Resume a previous conversation |
| `claude "fix the login bug"` | Run a one-off task and exit |

---

## The "I've never used the terminal" version

The terminal is just a text-based way to talk to your computer. Instead
of clicking icons, you type commands. It sounds scarier than it is.

The three commands you need to start:
1. Open your terminal (Terminal on Mac, PowerShell on Windows)
2. Type `cd /path/to/your/project` and press Enter — this navigates to
   your project folder ("cd" means "change directory")
3. Type `claude` and press Enter — this starts Claude Code

After that, you just type in plain English. You don't need to learn
terminal commands — Claude Code handles things like running tests,
checking git status, and making file changes for you, and it will ask
before doing anything significant.

The official docs have a terminal guide at:
`code.claude.com/docs/en/terminal-guide`
