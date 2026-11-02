---
description: "Record an injury: --occurred=\"YYYY-MM-DD HH:MM\", --aware (when a supervisor or manager learned of it, default the same), --mechanism, --nature, --severity (report-only, first-aid, medical, lost-time), --body-part, --location, --description, --mental, --notifiable. Shows every legal clock it starts."
---

# report-injury

Record an injury: --occurred="YYYY-MM-DD HH:MM", --aware (when a supervisor or manager learned of it, default the same), --mechanism, --nature, --severity (report-only, first-aid, medical, lost-time), --body-part, --location, --description, --mental, --notifiable. Shows every legal clock it starts.

Run `node scripts/claims.mjs report-injury <worker> --occurred="<when>" --mechanism="<how>" --nature="<what>" --severity=<severity>`. Add `--json` when you need every field. Resolve the worker, injury, claim, plan or site by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`. Copy the facts from the incident report or the person who saw it; never fill a gap. Ask whether it is a notifiable incident (death, serious injury or illness, dangerous incident) if it might be. Read back the deadlines it started.
