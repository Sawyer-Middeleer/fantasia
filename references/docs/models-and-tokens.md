# Models and tokens

**Sources:**
- https://code.claude.com/docs/en/model-config
- https://code.claude.com/docs/en/costs

---

## What tokens are

A **token** is roughly a word or part of a word — the unit Claude uses to
measure how much text it processes. Every message you send, every file
Claude reads, every response Claude writes — all of that is counted in tokens.

The **context window** is the total amount of text Claude can hold in its
working memory at once. Everything in the current conversation — your messages,
Claude's replies, files it read, CLAUDE.md — counts toward this limit. When
the conversation fills up, Claude Code automatically "compacts" (summarizes
older parts of the conversation) so you can keep going.

You can check your current usage with `/usage` in a session.

---

## What "running out of tokens" means

There are two different things people mean by this:

**1. Context window full in a session:** Your conversation has grown so large
that Claude Code needs to compact it. This happens automatically. You'll see
a "compacting" message. It's not an error — Claude summarizes older context
and continues. Your CLAUDE.md is always reloaded after compaction, so project
instructions persist.

**2. Plan usage limits:** On subscription plans (Pro, Max, Team), there are
rate limits — how much you can use Claude Code in a given time window. If you
hit these, you'll see a message about limits and may need to wait or upgrade.
The `/usage` command shows your plan usage.

**What to do if sessions fill up quickly:**
- Use `/clear` between unrelated tasks (start fresh for each new task)
- Keep CLAUDE.md under 200 lines — loaded every session, every time
- Move detailed procedures from CLAUDE.md to skills (they load on demand)
- Consider subagents for tasks that generate a lot of output
- More specific prompts ("add validation to the login function in auth.ts")
  need fewer files read than vague ones ("improve the codebase")

---

## The four model families

Claude Code has four model families. You switch with `/model` in a session
or set a default in settings.

| Model | Alias | What it's for |
|---|---|---|
| **Haiku** | `haiku` | Fast, lightweight. Good for simple searches and repetitive tasks. Most cost-effective. |
| **Sonnet** | `sonnet` | The everyday workhorse. Handles most coding tasks well. Good balance of speed and capability. |
| **Opus** | `opus` | Complex reasoning, architectural decisions, multi-step problems. Slower and costs more than Sonnet. |
| **Fable** | `fable` | The most capable. Built for long autonomous sessions and hard problems. Not the default — you select it explicitly. |

The default model on most plans is Sonnet. On higher-tier plans (Max, Team,
Enterprise pay-as-you-go, API), the default is Opus.

---

## Which model to use when

**Haiku:**
- Simple, scoped tasks where speed matters
- Search operations (when used as a subagent model)
- Tasks where you're doing many repetitive operations

**Sonnet:**
- Most day-to-day coding work
- Writing code, fixing bugs, reading files and explaining them
- A good default for interactive sessions

**Opus:**
- Designing a system architecture
- Complex refactors that touch many files
- Debugging hard problems that require multi-step reasoning
- When Sonnet seems to get confused or miss something

**Fable:**
- Very long autonomous sessions ("go implement this whole feature")
- Ambiguous, open-ended investigations
- Tasks you'd normally break into multiple pieces
- Note: Fable 5 always uses extended thinking and requires Claude Code
  v2.1.170 or later

**The `opusplan` shortcut:** Uses Opus during plan mode (figuring out what
to do) then switches to Sonnet for execution (actually doing it). Good for
complex tasks where you want deep reasoning on the plan but efficient
execution.

---

## Effort levels

Some models support "effort levels" that control how much the model thinks
before responding. More thinking = better on hard problems, but more tokens
and slower.

- `low` — faster, cheaper, for simple tasks
- `medium` / `high` — balanced (high is the default on most models)
- `xhigh` / `max` — deeper reasoning at higher cost

Set it with `/effort` in a session. Most people don't need to touch this —
the default (`high`) works well for everyday coding.

---

## Why Claude gives different answers to the same question

Claude is a probabilistic model — it samples from a distribution of possible
next words. This means the same question can get a slightly different answer
each time, even on identical input. This is called **non-determinism**, and
it's a fundamental property of how large language models work, not a bug.

In practice this means:
- If you run the same prompt twice, you may get two different but equally
  valid approaches
- If Claude seems to "know" something one session and not another, it may
  be a token-sampling difference, or the context may be different (different
  files loaded, different CLAUDE.md, different conversation history)
- If a response is wrong or not what you wanted, asking again or rephrasing
  often works — you're sampling a different part of the distribution

For code generation specifically, this is often a feature: Claude may suggest
different (and sometimes better) approaches on successive tries.

---

## A note on costs

Claude Code charges by token consumption on API plans. On subscription plans
(Pro, Max), usage is included with limits. The `/usage` command shows a
cost estimate for the current session, but the docs note: "The dollar figure
is an estimate computed locally from token counts and may differ from your
actual bill." For authoritative billing, check the Claude Console.

Average enterprise usage is around $13 per developer per active day. Costs
vary a lot based on which model you use (Haiku vs Opus is a big difference),
how much context you load (keeping CLAUDE.md short helps), and whether you're
doing many back-and-forth turns or single-shot tasks.
