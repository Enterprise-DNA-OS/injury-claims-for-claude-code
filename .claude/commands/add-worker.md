---
description: "Add a worker to a site, with --piawe (pre-injury average weekly earnings) and --hours where known."
---

# add-worker

Add a worker to a site, with --piawe (pre-injury average weekly earnings) and --hours where known.

Run `node scripts/claims.mjs add-worker --code=<code> --name="<name>" --site=<site>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
