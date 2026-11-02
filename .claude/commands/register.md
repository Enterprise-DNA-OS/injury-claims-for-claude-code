---
description: "The register of injuries, every injury in the order it happened (or --site=<site>), with the regulator reference where it was notifiable."
---

# register

The register of injuries, every injury in the order it happened (or --site=<site>), with the regulator reference where it was notifiable.

Run `node scripts/claims.mjs register`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
