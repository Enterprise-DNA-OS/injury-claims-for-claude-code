---
description: "Add a follow-up action to a claim or an injury: --what, --due."
---

# add-action

Add a follow-up action to a claim or an injury: --what, --due.

Run `node scripts/claims.mjs add-action <claim or injury> --what="<what>" --due=<date>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
