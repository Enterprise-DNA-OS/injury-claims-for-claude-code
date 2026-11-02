---
description: "Record a payment on a claim: --kind (first-week, weekly, medical, allied, travel, legal, other), --payee, --amount, --from and --to for a period, --paid, --reimbursable, --invoice. Refuses a period already paid and an invoice already paid."
---

# pay

Record a payment on a claim: --kind (first-week, weekly, medical, allied, travel, legal, other), --payee, --amount, --from and --to for a period, --paid, --reimbursable, --invoice. Refuses a period already paid and an invoice already paid.

Run `node scripts/claims.mjs pay <claim> --kind=<kind> --payee="<payee>" --amount=<amount>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`. This records a payment made. It never makes one.
