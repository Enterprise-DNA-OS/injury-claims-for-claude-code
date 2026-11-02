---
description: "Record the claim forwarded to the insurer or agent (--date, --number for the claim number it gave)."
---

# forward-claim

Record the claim forwarded to the insurer or agent (--date, --number for the claim number it gave).

Run `node scripts/claims.mjs forward-claim <claim>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
