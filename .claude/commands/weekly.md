---
description: "The statutory weekly amount for a claim this week (or --week=N), from pre-injury earnings, current earnings (--earnings) and hours worked (--hours), with the rule and the step-down date. Before the indexed maximum."
---

# weekly

The statutory weekly amount for a claim this week (or --week=N), from pre-injury earnings, current earnings (--earnings) and hours worked (--hours), with the rule and the step-down date. Before the indexed maximum.

Run `node scripts/claims.mjs weekly <claim>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say plainly that the insurer's calculation is the one that pays, and that the indexed maximum applies once set with `/set max_weekly_cents_<state>`. Never guess a rate where the command returns none.
