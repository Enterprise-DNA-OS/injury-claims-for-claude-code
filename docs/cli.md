# CLI reference

Every command is `node scripts/claims.mjs <command> [arguments] [--options]`. Human tables by default, `--json` for machines. Every write needs `--actor="<your name>"`. Dates are `YYYY-MM-DD`; moments are `"YYYY-MM-DD HH:MM"`. Amounts are dollars and cents (`1450.00`).

## attention

`node scripts/claims.mjs attention`

Show what needs a person today: legal deadlines overdue or due soon (insurer told, claim forwarded, regulator notified, register entry, cover decision, first week compensation, mental injury notice), expired or missing certificates, missed plan reviews, suitable capacity with no agreed plan, insurer decisions to chase, reimbursements to chase, certificates expiring, overdue actions, claims gone quiet and step-downs coming.

## deadlines

`node scripts/claims.mjs deadlines`

Every statutory deadline on an injury or claim, open ones first, with the rule behind each. --site to filter, --all to include the ones already met.

## compliance

`node scripts/claims.mjs compliance`

Check the records against the rules in docs/compliance.md, law first, each with its source: insurer notice (NSW 48 hours, Qld 8 business days), claims forwarded (NSW 7 days, Vic 10 days), the Vic mental injury notice, NZ cover decisions in 21 days, first week compensation, notifiable incidents and the register of injuries.

## sites

`node scripts/claims.mjs sites`

Every site: its jurisdiction, whether it is insured, self-insured or an ACC Accredited Employer, the insurer, the return to work coordinator, workers, open claims and overdue deadlines.

## site

`node scripts/claims.mjs site <site>`

Everything about one site: open claims, deadlines not met, and injuries in the last 90 days.

## workers

`node scripts/claims.mjs workers`

Every worker (or --site=<site>): role, status, hours, pre-injury average weekly earnings and how many injuries.

## worker

`node scripts/claims.mjs worker <worker>`

One worker and every injury and claim they have had.

## injuries

`node scripts/claims.mjs injuries`

Injuries in the last 365 days (or --days=N, --site=<site>), newest first, with any claim.

## injury

`node scripts/claims.mjs injury <injury>`

One injury: the record, its claim, every deadline it started and the actions on it.

## claims

`node scripts/claims.mjs claims`

Every claim (or --open, --site=<site>): liability, capacity, certificate, plan, week of incapacity, money paid and the estimate.

## claim

`node scripts/claims.mjs claim <claim>`

One claim in full: where it stands, deadlines, certificates, plans, payments, actions and the last ten case notes. Find it by claim ref, the insurer's claim number or the worker's name.

## register

`node scripts/claims.mjs register`

The register of injuries, every injury in the order it happened (or --site=<site>), with the regulator reference where it was notifiable.

## certificates

`node scripts/claims.mjs certificates`

The current certificate on every open claim: capacity, hours, restrictions, when it runs out.

## plans

`node scripts/claims.mjs plans`

Every return to work plan not ended, with its review date. Flags missed reviews and plans never agreed.

## payments

`node scripts/claims.mjs payments`

Every payment on claims, newest first (or --claim=<claim>).

## reimbursements

`node scripts/claims.mjs reimbursements`

Money paid that the insurer or agent owes back, and how long it has waited. --open hides what has come back.

## weekly

`node scripts/claims.mjs weekly <claim>`

The statutory weekly amount for a claim this week (or --week=N), from pre-injury earnings, current earnings (--earnings) and hours worked (--hours), with the rule and the step-down date. Before the indexed maximum.

## costs

`node scripts/claims.mjs costs`

Money by site since 1 January (or --from=date): claims, open, paid, waiting on reimbursement and estimated.

## actions

`node scripts/claims.mjs actions`

Every follow-up action, overdue first. --open hides closed ones.

## insights

`node scripts/claims.mjs insights`

The ten questions the claims dashboard does not answer, run on the records.

## activity

`node scripts/claims.mjs activity`

The activity log for the last 7 days (or --days=N): who did what.

## settings

`node scripts/claims.mjs settings`

The house rules: quiet days, certificate warning days, plan days, reimbursement chase days, and any weekly maximums set.

## add-site

`node scripts/claims.mjs add-site --code=<CODE> --name="<name>" --jurisdiction=<state> --arrangement=<arrangement>`

Add a site: --code, --name, --jurisdiction (NZ, NSW, VIC, QLD, WA, SA, TAS, ACT, NT, CTH), --arrangement (insured, self-insured, accredited), --insurer, --policy, --coordinator.

## add-worker

`node scripts/claims.mjs add-worker --code=<code> --name="<name>" --site=<site>`

Add a worker to a site, with --piawe (pre-injury average weekly earnings) and --hours where known.

## worker-status

`node scripts/claims.mjs worker-status <worker> --status=active|left`

Mark a worker as left (--status=left) or active, or update --piawe and --hours.

## report-injury

`node scripts/claims.mjs report-injury <worker> --occurred="<when>" --mechanism="<how>" --nature="<what>" --severity=<severity>`

Record an injury: --occurred="YYYY-MM-DD HH:MM", --aware (when a supervisor or manager learned of it, default the same), --mechanism, --nature, --severity (report-only, first-aid, medical, lost-time), --body-part, --location, --description, --mental, --notifiable. Shows every legal clock it starts.

## registered

`node scripts/claims.mjs registered <injury>`

Record that an injury is in the register of injuries (NSW s 63, Vic WIRC Act).

## notify-insurer

`node scripts/claims.mjs notify-insurer <injury>`

Record that the insurer was told of an injury (--at="YYYY-MM-DD HH:MM", default now). Says whether it was inside the deadline.

## set-notifiable

`node scripts/claims.mjs set-notifiable <injury>`

Mark an injury as a notifiable incident, so the regulator notice clock starts.

## notify-regulator

`node scripts/claims.mjs notify-regulator <injury> --reference=<regulator reference>`

Record the regulator notification of a notifiable incident, with its --reference and --at.

## lodge-claim

`node scripts/claims.mjs lodge-claim <injury> --received=<date>`

Record a claim form (or ACC45) received: --received, --weekly with --incapacity-from for time off work, --number, --doctor, --estimate. Shows the claim clocks it starts.

## forward-claim

`node scripts/claims.mjs forward-claim <claim>`

Record the claim forwarded to the insurer or agent (--date, --number for the claim number it gave).

## notify-authority

`node scripts/claims.mjs notify-authority <claim>`

Record WorkSafe Victoria told of a mental injury claim (due within 3 business days of receiving it).

## liability

`node scripts/claims.mjs liability <claim> --decision=<decision>`

Record the liability or cover decision: --decision (provisional, reasonable-excuse, accepted, declined), --date, --reason (required to decline). Refuses to decline a New Zealand claim whose cover is already deemed.

## certificate

`node scripts/claims.mjs certificate <claim> --from=<date> --to=<date> --capacity=<capacity>`

Record a certificate of capacity: --from, --to, --capacity (full, suitable, none), --hours, --restrictions (required for suitable), --doctor, --issued.

## add-plan

`node scripts/claims.mjs add-plan <claim> --starts=<date> --review=<date> --duties="<duties>"`

Add a return to work plan as a draft: --starts, --review, --duties, --hours. Refuses hours above the certificate or a plan on no capacity.

## agree-plan

`node scripts/claims.mjs agree-plan <plan> --by="<names>"`

Record a plan agreed (--by="<names>", --date). Ends the plan it replaces.

## end-plan

`node scripts/claims.mjs end-plan <plan>`

End a return to work plan (--date).

## pay

`node scripts/claims.mjs pay <claim> --kind=<kind> --payee="<payee>" --amount=<amount>`

Record a payment on a claim: --kind (first-week, weekly, medical, allied, travel, legal, other), --payee, --amount, --from and --to for a period, --paid, --reimbursable, --invoice. Refuses a period already paid and an invoice already paid.

## reimbursed

`node scripts/claims.mjs reimbursed <payment>`

Record a reimbursement received from the insurer or agent for a payment.

## estimate

`node scripts/claims.mjs estimate <claim> --amount=<amount>`

Set the claim estimate (--amount).

## close-claim

`node scripts/claims.mjs close-claim <claim> --reason="<why>"`

Close a claim with a --reason. Refuses while a legal deadline is open. Ends any plan.

## reopen-claim

`node scripts/claims.mjs reopen-claim <claim> --reason="<why>"`

Reopen a closed claim with a --reason.

## add-action

`node scripts/claims.mjs add-action <claim or injury> --what="<what>" --due=<date>`

Add a follow-up action to a claim or an injury: --what, --due.

## close-action

`node scripts/claims.mjs close-action <action> --outcome="<what happened>"`

Close an action with its --outcome.

## note

`node scripts/claims.mjs note <claim> --kind=call --who="<who>" --text="<what was said>"`

Add a case note to a claim: --kind (call, email, letter, meeting, note), --who, --text.

## set

`node scripts/claims.mjs set <key> <value>`

Change a house rule or a weekly maximum (for example `set max_weekly_cents_nsw 254000`).

## weekly-review

`node scripts/claims.mjs weekly-review`

Write the Monday review to drafts/: what needs a person, every open claim, and money by site.

## draft-insurer-notice

`node scripts/claims.mjs draft-insurer-notice <injury>`

Draft the injury notice to the insurer, with the deadline and the rule. Written to drafts/, never sent.

## draft-doctor-letter

`node scripts/claims.mjs draft-doctor-letter <claim>`

Draft the letter to the treating doctor offering suitable duties (--duties). Written to drafts/, never sent.

## draft-rtw-plan

`node scripts/claims.mjs draft-rtw-plan <plan>`

Draft a return to work plan for signing, from the plan and the current certificate. Written to drafts/.

## draft-cover-decision

`node scripts/claims.mjs draft-cover-decision <claim>`

Draft the written cover decision an ACC Accredited Employer owes the claimant, accepted or declined with the reason, and the deemed-cover wording where the 21 days ran out. Written to drafts/, never sent.

## import

`node scripts/claims.mjs import solv <file.csv> --kind=workers|injuries|claims --dry-run`

Bring workers, injuries and claims across from a Solv export (comma-separated). Dry run first. Import workers, then injuries, then claims.

## export

`node scripts/claims.mjs export`

Export every record to one JSON file the business owns. It holds confidential injury and health information: keep it as securely as the database.
