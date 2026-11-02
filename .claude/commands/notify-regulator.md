---
description: "Record the regulator notification of a notifiable incident, with its --reference and --at."
---

# notify-regulator

Record the regulator notification of a notifiable incident, with its --reference and --at.

Run `node scripts/claims.mjs notify-regulator <injury> --reference=<regulator reference>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
