---
description: "Draft the injury notice to the insurer, with the deadline and the rule. Written to drafts/, never sent."
---

# draft-insurer-notice

Draft the injury notice to the insurer, with the deadline and the rule. Written to drafts/, never sent.

Run `node scripts/claims.mjs draft-insurer-notice <injury>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
