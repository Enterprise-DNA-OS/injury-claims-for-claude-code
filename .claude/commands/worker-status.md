---
description: "Mark a worker as left (--status=left) or active, or update --piawe and --hours."
---

# worker-status

Mark a worker as left (--status=left) or active, or update --piawe and --hours.

Run `node scripts/claims.mjs worker-status <worker> --status=active|left`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
