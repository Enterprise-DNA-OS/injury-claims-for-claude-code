# Injury Claims for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS: an insured employer, a licensed self-insurer, or an ACC Accredited Employer]
- **Operator:** [YOUR NAME], [your role: return to work coordinator, injury management adviser, claims manager, health and safety manager]
- **What matters most:** [for example: no insurer notice ever late, every worker on suitable duties has an agreed plan, nothing sits with the agent unreimbursed past 30 days]

The work is workplace injuries and workers' compensation claims in New Zealand and Australia: sites and the scheme each sits under, workers and their pre-injury earnings, injuries and the register, claims and the clocks the law starts on them, certificates of capacity, return to work plans, weekly compensation, payments and reimbursements, follow-up actions and case notes.

## Rules

- Read the CLI result before answering. Every answer about a worker, injury, claim, certificate or payment starts with data from `node scripts/claims.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- These are confidential injury and health records. Show them only to the operator. Never paste them into anything outside this folder.
- Never decide liability, cover, capacity or a weekly amount. Record the decision the insurer, agent or accredited employer made, and copy capacity, hours and restrictions word for word from the certificate.
- A deadline the law sets is a deadline. If `/attention` shows one overdue, say so first, with the rule. If a command refuses (deemed cover cannot be declined, a plan above the certificate, a period already paid), say why and stop. Never look for a way around it.
- Every write names `--actor`. That is a label in the activity log, not a verified identity.
- Never invent a date, a time of injury, a claim number, a regulator reference, an amount or a doctor's restriction. Copy them from the form, the certificate, the insurer or the operator.
- Never send, call, pay or delete. Notices, letters, plans and reviews are drafts in `drafts/`; documents are in `docs-out/`. Recording an insurer notice or a payment does not make it happen; a person does that. Injury and claim records are never deleted, and the database refuses.
- The rules in `docs/compliance.md` are records checks, not legal advice. If a rule looks out of date, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Every follow-up action, overdue first. --open hides closed ones. | `/actions` |
| The activity log for the last 7 days (or --days=N): who did what. | `/activity` |
| Add a follow-up action to a claim or an injury: --what, --due. | `/add-action` |
| Add a return to work plan as a draft: --starts, --review, --duties, --hours. Refuses hours above the certificate or a plan on no capacity. | `/add-plan` |
| Add a site: --code, --name, --jurisdiction (NZ, NSW, VIC, QLD, WA, SA, TAS, ACT, NT, CTH), --arrangement (insured, self-insured, accredited), --insurer, --policy, --coordinator. | `/add-site` |
| Add a worker to a site, with --piawe (pre-injury average weekly earnings) and --hours where known. | `/add-worker` |
| Record a plan agreed (--by="<names>", --date). Ends the plan it replaces. | `/agree-plan` |
| Show what needs a person today: legal deadlines overdue or due soon (insurer told, claim forwarded, regulator notified, register entry, cover decision, first week compensation, mental injury notice), expired or missing certificates, missed plan reviews, suitable capacity with no agreed plan, insurer decisions to chase, reimbursements to chase, certificates expiring, overdue actions, claims gone quiet and step-downs coming. | `/attention` |
| Record a certificate of capacity: --from, --to, --capacity (full, suitable, none), --hours, --restrictions (required for suitable), --doctor, --issued. | `/certificate` |
| The current certificate on every open claim: capacity, hours, restrictions, when it runs out. | `/certificates` |
| One claim in full: where it stands, deadlines, certificates, plans, payments, actions and the last ten case notes. Find it by claim ref, the insurer's claim number or the worker's name. | `/claim` |
| Every claim (or --open, --site=<site>): liability, capacity, certificate, plan, week of incapacity, money paid and the estimate. | `/claims` |
| Close an action with its --outcome. | `/close-action` |
| Close a claim with a --reason. Refuses while a legal deadline is open. Ends any plan. | `/close-claim` |
| Check the records against the rules in docs/compliance.md, law first, each with its source: insurer notice (NSW 48 hours, Qld 8 business days), claims forwarded (NSW 7 days, Vic 10 days), the Vic mental injury notice, NZ cover decisions in 21 days, first week compensation, notifiable incidents and the register of injuries. | `/compliance` |
| Money by site since 1 January (or --from=date): claims, open, paid, waiting on reimbursement and estimated. | `/costs` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Every statutory deadline on an injury or claim, open ones first, with the rule behind each. --site to filter, --all to include the ones already met. | `/deadlines` |
| Render the register of injuries for each site, return to work plans and claim summaries as branded HTML in docs-out/. | `/documents` |
| Draft the written cover decision an ACC Accredited Employer owes the claimant, accepted or declined with the reason, and the deemed-cover wording where the 21 days ran out. Written to drafts/, never sent. | `/draft-cover-decision` |
| Draft the letter to the treating doctor offering suitable duties (--duties). Written to drafts/, never sent. | `/draft-doctor-letter` |
| Draft the injury notice to the insurer, with the deadline and the rule. Written to drafts/, never sent. | `/draft-insurer-notice` |
| Draft a return to work plan for signing, from the plan and the current certificate. Written to drafts/. | `/draft-rtw-plan` |
| End a return to work plan (--date). | `/end-plan` |
| Set the claim estimate (--amount). | `/estimate` |
| Export every record to one JSON file the business owns. It holds confidential injury and health information: keep it as securely as the database. | `/export` |
| Record the claim forwarded to the insurer or agent (--date, --number for the claim number it gave). | `/forward-claim` |
| Bring workers, injuries and claims across from a Solv export (comma-separated). Dry run first. Import workers, then injuries, then claims. | `/import` |
| Injuries in the last 365 days (or --days=N, --site=<site>), newest first, with any claim. | `/injuries` |
| One injury: the record, its claim, every deadline it started and the actions on it. | `/injury` |
| The ten questions the claims dashboard does not answer, run on the records. | `/insights` |
| Record the liability or cover decision: --decision (provisional, reasonable-excuse, accepted, declined), --date, --reason (required to decline). Refuses to decline a New Zealand claim whose cover is already deemed. | `/liability` |
| Record a claim form (or ACC45) received: --received, --weekly with --incapacity-from for time off work, --number, --doctor, --estimate. Shows the claim clocks it starts. | `/lodge-claim` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. | `/new-view` |
| Add a case note to a claim: --kind (call, email, letter, meeting, note), --who, --text. | `/note` |
| Record WorkSafe Victoria told of a mental injury claim (due within 3 business days of receiving it). | `/notify-authority` |
| Record that the insurer was told of an injury (--at="YYYY-MM-DD HH:MM", default now). Says whether it was inside the deadline. | `/notify-insurer` |
| Record the regulator notification of a notifiable incident, with its --reference and --at. | `/notify-regulator` |
| Record a payment on a claim: --kind (first-week, weekly, medical, allied, travel, legal, other), --payee, --amount, --from and --to for a period, --paid, --reimbursable, --invoice. Refuses a period already paid and an invoice already paid. | `/pay` |
| Every payment on claims, newest first (or --claim=<claim>). | `/payments` |
| Every return to work plan not ended, with its review date. Flags missed reviews and plans never agreed. | `/plans` |
| The register of injuries, every injury in the order it happened (or --site=<site>), with the regulator reference where it was notifiable. | `/register` |
| Record that an injury is in the register of injuries (NSW s 63, Vic WIRC Act). | `/registered` |
| Record a reimbursement received from the insurer or agent for a payment. | `/reimbursed` |
| Money paid that the insurer or agent owes back, and how long it has waited. --open hides what has come back. | `/reimbursements` |
| Reopen a closed claim with a --reason. | `/reopen-claim` |
| Record an injury: --occurred="YYYY-MM-DD HH:MM", --aware (when a supervisor or manager learned of it, default the same), --mechanism, --nature, --severity (report-only, first-aid, medical, lost-time), --body-part, --location, --description, --mental, --notifiable. Shows every legal clock it starts. | `/report-injury` |
| Change a house rule or a weekly maximum (for example `set max_weekly_cents_nsw 254000`). | `/set` |
| Mark an injury as a notifiable incident, so the regulator notice clock starts. | `/set-notifiable` |
| The house rules: quiet days, certificate warning days, plan days, reimbursement chase days, and any weekly maximums set. | `/settings` |
| Everything about one site: open claims, deadlines not met, and injuries in the last 90 days. | `/site` |
| Every site: its jurisdiction, whether it is insured, self-insured or an ACC Accredited Employer, the insurer, the return to work coordinator, workers, open claims and overdue deadlines. | `/sites` |
| Render the read-only dashboards (this week, statutory deadlines, money) as branded HTML in views/. | `/view` |
| The statutory weekly amount for a claim this week (or --week=N), from pre-injury earnings, current earnings (--earnings) and hours worked (--hours), with the rule and the step-down date. Before the indexed maximum. | `/weekly` |
| Write the Monday review to drafts/: what needs a person, every open claim, and money by site. | `/weekly-review` |
| One worker and every injury and claim they have had. | `/worker` |
| Mark a worker as left (--status=left) or active, or update --piawe and --hours. | `/worker-status` |
| Every worker (or --site=<site>): role, status, hours, pre-injury average weekly earnings and how many injuries. | `/workers` |

If an ask fits nothing here, run the CLI directly (`node scripts/claims.mjs --help`) and then propose a new command for it.

## Where things live

- `scripts/claims.mjs` the CLI; `scripts/lib/domain.mjs` the rules. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL, with the deadline and weekly rate rules as views and functions. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `views.json` and `documents.json` the dashboards and documents; `brand.json` the name, logo and colours on them.
- `docs/compliance.md` every rule and its source. `docs/replace-solv.md` moving off Solv.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/solv
