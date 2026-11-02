---
description: "Add a site: --code, --name, --jurisdiction (NZ, NSW, VIC, QLD, WA, SA, TAS, ACT, NT, CTH), --arrangement (insured, self-insured, accredited), --insurer, --policy, --coordinator."
---

# add-site

Add a site: --code, --name, --jurisdiction (NZ, NSW, VIC, QLD, WA, SA, TAS, ACT, NT, CTH), --arrangement (insured, self-insured, accredited), --insurer, --policy, --coordinator.

Run `node scripts/claims.mjs add-site --code=<CODE> --name="<name>" --jurisdiction=<state> --arrangement=<arrangement>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
