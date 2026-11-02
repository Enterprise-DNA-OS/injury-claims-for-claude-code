---
description: "Show what needs a person today: legal deadlines overdue or due soon (insurer told, claim forwarded, regulator notified, register entry, cover decision, first week compensation, mental injury notice), expired or missing certificates, missed plan reviews, suitable capacity with no agreed plan, insurer decisions to chase, reimbursements to chase, certificates expiring, overdue actions, claims gone quiet and step-downs coming."
---

# attention

Show what needs a person today: legal deadlines overdue or due soon (insurer told, claim forwarded, regulator notified, register entry, cover decision, first week compensation, mental injury notice), expired or missing certificates, missed plan reviews, suitable capacity with no agreed plan, insurer decisions to chase, reimbursements to chase, certificates expiring, overdue actions, claims gone quiet and step-downs coming.

Run `node scripts/claims.mjs attention`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with anything that breaks the law, and name the rule. Suggest the one next step for each line (usually `/notify-insurer`, `/forward-claim`, `/notify-regulator`, `/registered`, `/liability`, `/pay`, `/certificate` or `/draft-doctor-letter`).
