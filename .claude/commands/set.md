---
description: "Change a house rule or a weekly maximum (for example `set max_weekly_cents_nsw 254000`)."
---

# set

Change a house rule or a weekly maximum (for example `set max_weekly_cents_nsw 254000`).

Run `node scripts/claims.mjs set <key> <value>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
