---
description: "Check the records against the rules in docs/compliance.md, law first, each with its source: insurer notice (NSW 48 hours, Qld 8 business days), claims forwarded (NSW 7 days, Vic 10 days), the Vic mental injury notice, NZ cover decisions in 21 days, first week compensation, notifiable incidents and the register of injuries."
---

# compliance

Check the records against the rules in docs/compliance.md, law first, each with its source: insurer notice (NSW 48 hours, Qld 8 business days), claims forwarded (NSW 7 days, Vic 10 days), the Vic mental injury notice, NZ cover decisions in 21 days, first week compensation, notifiable incidents and the register of injuries.

Run `node scripts/claims.mjs compliance`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Report as a table: rule, breached, due soon, met late, clean, source. Then the breaches, worst first. If a rule in docs/compliance.md looks out of date, say so and stop.
