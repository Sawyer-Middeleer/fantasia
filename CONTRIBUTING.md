# Contributing to fantasia

The most useful contributions don't need any code. fantasia's checks and answers
live in plain data and text files, so anyone can sharpen them directly.

## What to add

- **A new kind of secret to catch** → [`references/rules/secrets.json`](references/rules/secrets.json)
- **A new kind of sensitive file** (financial / medical / personal) → [`references/rules/sensitive.json`](references/rules/sensitive.json)
- **A new settings check** → [`references/rules/settings-checks.json`](references/rules/settings-checks.json)
- **Clearer wording for a finding** → [`references/checks.md`](references/checks.md)
- **A better plain-English answer** → [`references/concerns.md`](references/concerns.md) and [`references/docs/`](references/docs/)

Add a check once and all three skills benefit: the safety check flags it, setup
prevents it, and ask explains it.

## Two rules that don't bend

1. **Never reveal a real secret.** The scanner reads the bytes so Claude doesn't
   have to, and findings only ever carry a masked value — the real characters
   replaced with dots. Any change must keep that masking intact.
2. **Plain, honest voice.** Write for someone non-technical. Say what was actually
   found, and whether it matters right now. See [`references/standards.md`](references/standards.md).

## If you touch the scanner

```bash
node test/run.mjs            # the test suite — keep it green
claude plugin validate .    # structure check
```

It's plain Node with no dependencies and runs on Windows, macOS, and Linux. If
you add a rule, add a test that proves it fires and that the secret stays masked.

## If you touch the visual report

`bin/fantasia-visual` renders a scan into the self-contained `FANTASIA-REPORT.html`.
It consumes **only** the scanner's already-redacted JSON — never a project file —
so the masking rule above is preserved by construction. It's zero-dependency Node;
every dynamic value is HTML-escaped and the embedded data blob is guarded so it
can't break out of `<script>`. Keep both invariants if you change it.

## Pull requests

Keep changes focused, run the tests, and say what a user would see differently.
Thanks for helping keep the brooms in their lane. 🪄
