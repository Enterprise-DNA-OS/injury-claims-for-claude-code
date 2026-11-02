---
description: "Record the liability or cover decision: --decision (provisional, reasonable-excuse, accepted, declined), --date, --reason (required to decline). Refuses to decline a New Zealand claim whose cover is already deemed."
---

# liability

Record the liability or cover decision: --decision (provisional, reasonable-excuse, accepted, declined), --date, --reason (required to decline). Refuses to decline a New Zealand claim whose cover is already deemed.

Run `node scripts/claims.mjs liability <claim> --decision=<decision>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`. Record the decision the insurer, agent or accredited employer actually made. Never make it.
