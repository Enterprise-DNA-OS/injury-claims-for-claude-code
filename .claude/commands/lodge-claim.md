---
description: "Record a claim form (or ACC45) received: --received, --weekly with --incapacity-from for time off work, --number, --doctor, --estimate. Shows the claim clocks it starts."
---

# lodge-claim

Record a claim form (or ACC45) received: --received, --weekly with --incapacity-from for time off work, --number, --doctor, --estimate. Shows the claim clocks it starts.

Run `node scripts/claims.mjs lodge-claim <injury> --received=<date>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
