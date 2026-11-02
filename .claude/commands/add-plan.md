---
description: "Add a return to work plan as a draft: --starts, --review, --duties, --hours. Refuses hours above the certificate or a plan on no capacity."
---

# add-plan

Add a return to work plan as a draft: --starts, --review, --duties, --hours. Refuses hours above the certificate or a plan on no capacity.

Run `node scripts/claims.mjs add-plan <claim> --starts=<date> --review=<date> --duties="<duties>"`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
