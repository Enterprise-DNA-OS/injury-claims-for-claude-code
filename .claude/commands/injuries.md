---
description: "Injuries in the last 365 days (or --days=N, --site=<site>), newest first, with any claim."
---

# injuries

Injuries in the last 365 days (or --days=N, --site=<site>), newest first, with any claim.

Run `node scripts/claims.mjs injuries`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
