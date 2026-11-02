---
description: "Mark an injury as a notifiable incident, so the regulator notice clock starts."
---

# set-notifiable

Mark an injury as a notifiable incident, so the regulator notice clock starts.

Run `node scripts/claims.mjs set-notifiable <injury>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
