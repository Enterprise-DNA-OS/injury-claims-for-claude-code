---
description: "Every worker (or --site=<site>): role, status, hours, pre-injury average weekly earnings and how many injuries."
---

# workers

Every worker (or --site=<site>): role, status, hours, pre-injury average weekly earnings and how many injuries.

Run `node scripts/claims.mjs workers`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
