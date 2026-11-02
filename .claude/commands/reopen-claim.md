---
description: "Reopen a closed claim with a --reason."
---

# reopen-claim

Reopen a closed claim with a --reason.

Run `node scripts/claims.mjs reopen-claim <claim> --reason="<why>"`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
