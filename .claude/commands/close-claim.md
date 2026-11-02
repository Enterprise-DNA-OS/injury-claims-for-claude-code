---
description: "Close a claim with a --reason. Refuses while a legal deadline is open. Ends any plan."
---

# close-claim

Close a claim with a --reason. Refuses while a legal deadline is open. Ends any plan.

Run `node scripts/claims.mjs close-claim <claim> --reason="<why>"`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
