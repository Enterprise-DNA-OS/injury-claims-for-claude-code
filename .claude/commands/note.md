---
description: "Add a case note to a claim: --kind (call, email, letter, meeting, note), --who, --text."
---

# note

Add a case note to a claim: --kind (call, email, letter, meeting, note), --who, --text.

Run `node scripts/claims.mjs note <claim> --kind=call --who="<who>" --text="<what was said>"`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
