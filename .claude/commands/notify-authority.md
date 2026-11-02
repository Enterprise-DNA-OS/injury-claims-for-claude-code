---
description: "Record WorkSafe Victoria told of a mental injury claim (due within 3 business days of receiving it)."
---

# notify-authority

Record WorkSafe Victoria told of a mental injury claim (due within 3 business days of receiving it).

Run `node scripts/claims.mjs notify-authority <claim>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
