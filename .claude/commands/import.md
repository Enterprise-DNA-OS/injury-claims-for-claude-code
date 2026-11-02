---
description: "Bring workers, injuries and claims across from a Solv export (comma-separated). Dry run first. Import workers, then injuries, then claims."
---

# import

Bring workers, injuries and claims across from a Solv export (comma-separated). Dry run first. Import workers, then injuries, then claims.

Run `node scripts/claims.mjs import solv <file.csv> --kind=workers|injuries|claims --dry-run`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`. Always run with `--dry-run` first and show the counts. One bad row stops the whole file: fix the row or map the column with `--map=<file.json>` (see docs/replace-solv.md).
