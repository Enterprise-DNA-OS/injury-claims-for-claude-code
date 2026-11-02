---
description: "Record that the insurer was told of an injury (--at=\"YYYY-MM-DD HH:MM\", default now). Says whether it was inside the deadline."
---

# notify-insurer

Record that the insurer was told of an injury (--at="YYYY-MM-DD HH:MM", default now). Says whether it was inside the deadline.

Run `node scripts/claims.mjs notify-insurer <injury>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`. Only record what has happened. If it has not been sent yet, offer `/draft-insurer-notice`.
