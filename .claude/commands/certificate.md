---
description: "Record a certificate of capacity: --from, --to, --capacity (full, suitable, none), --hours, --restrictions (required for suitable), --doctor, --issued."
---

# certificate

Record a certificate of capacity: --from, --to, --capacity (full, suitable, none), --hours, --restrictions (required for suitable), --doctor, --issued.

Run `node scripts/claims.mjs certificate <claim> --from=<date> --to=<date> --capacity=<capacity>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`. Copy the restrictions word for word from the certificate.
