---
description: "Draft the written cover decision an ACC Accredited Employer owes the claimant, accepted or declined with the reason, and the deemed-cover wording where the 21 days ran out. Written to drafts/, never sent."
---

# draft-cover-decision

Draft the written cover decision an ACC Accredited Employer owes the claimant, accepted or declined with the reason, and the deemed-cover wording where the 21 days ran out. Written to drafts/, never sent.

Run `node scripts/claims.mjs draft-cover-decision <claim>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
