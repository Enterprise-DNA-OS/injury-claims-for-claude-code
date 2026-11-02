---
description: "Record that an injury is in the register of injuries (NSW s 63, Vic WIRC Act)."
---

# registered

Record that an injury is in the register of injuries (NSW s 63, Vic WIRC Act).

Run `node scripts/claims.mjs registered <injury>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
