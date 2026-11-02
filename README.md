<h1 align="center">Injury Claims for Claude Code</h1>

<p align="center">
  <strong>The open-source injury and workers' compensation claims system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Solv data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=solv">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/solv?utm_source=github&utm_medium=readme&utm_campaign=solv">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-solv">Instead of Solv</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Injury Claims for Claude Code does the job you pay Solv for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Solv dashboard cannot.

Solv publishes no price. Its pricing page says you pay a one-time setup fee and an annual licence fee, quoted on the size of your business, your requirements and your injury and claim volumes ([solv.com.au/pricing](https://solv.com.au/pricing/), checked 2 November 2026). Here the database is yours, and another site, claim or case manager costs nothing.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=solv).

It covers workplace injuries and workers' compensation claims for an employer in New Zealand or Australia: the return to work coordinator at an insured business, the claims team at a self-insurer, or an ACC Accredited Employer. Injuries go into the register and start every clock the law sets: the insurer told within 48 hours in NSW (1998 Act s 44) or 8 business days in Queensland (WCRA s 133(3)), the claim forwarded within 7 days in NSW (s 261) or 10 in Victoria (WIRC Act s 73(1)), a mental injury notified to WorkSafe Victoria within 3 business days, a cover decision within 21 days for an accredited employer or cover is deemed (Accident Compensation Act 2001 ss 56 and 58), first week compensation at 80% (s 98), and notifiable incidents to the regulator. Then certificates of capacity, return to work plans, weekly compensation at the right step-down rate, payments, reimbursements, case notes and the Monday review.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no setup fee, no annual licence. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/injury-claims-for-claude-code.git
cd injury-claims-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/claim Priya`, `/weekly CLM-0006` and `/insights` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Legal deadlines overdue or due soon, then expired certificates, missed plan reviews, suitable capacity with no plan, insurer decisions and reimbursements to chase, overdue actions, quiet claims and step-downs coming |
| `/report-injury` | Record an injury. It goes in the register and shows every clock it starts, with the rule |
| `/notify-insurer` | The insurer told. Says whether it was inside 48 hours (NSW) or 8 business days (Queensland) |
| `/lodge-claim` and `/forward-claim` | A claim form or ACC45 received, and sent to the insurer or agent inside 7 days (NSW) or 10 (Victoria) |
| `/liability` | The decision as made. A New Zealand claim past 21 days cannot be declined: cover is deemed |
| `/certificate` | A certificate of capacity, restrictions copied word for word |
| `/add-plan` and `/agree-plan` | A return to work plan. Refuses hours above the certificate, or a plan on no capacity |
| `/weekly` | The statutory weekly amount this week: 95% then 80% of PIAWE in NSW and Victoria, 80% for ACC, with the step-down date |
| `/pay` and `/reimbursed` | A payment made on a claim, never the same period or invoice twice, and money back from the insurer |
| `/deadlines` and `/compliance` | Every statutory clock and how it was met, with its source |
| `/register` | The register of injuries for each workplace |
| `/weekly-review` | The Monday review, written to `drafts/` |
| `/draft-insurer-notice` | The injury notice to the insurer, with the deadline |
| `/draft-doctor-letter` | The suitable duties letter to the treating doctor |
| `/draft-rtw-plan` | The return to work plan for signing |
| `/draft-cover-decision` | The written cover decision an accredited employer owes, with the deemed-cover wording where the 21 days ran out |
| `/insights` | The ten questions below |

The working commands: `/add-site`, `/add-worker`, `/worker-status`, `/registered`, `/set-notifiable`, `/notify-regulator`, `/notify-authority`, `/end-plan`, `/estimate`, `/close-claim`, `/reopen-claim`, `/add-action`, `/close-action`, `/note`, `/set`. The reads: `/sites`, `/site`, `/workers`, `/worker`, `/injuries`, `/injury`, `/claims`, `/claim`, `/certificates`, `/plans`, `/payments`, `/reimbursements`, `/costs`, `/actions`, `/activity`, `/settings`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 58 commands in all; [docs/cli.md](docs/cli.md) lists every one.

Names match case-insensitively. A claim can be found by its reference, the insurer's claim number or the worker's name. A partial name works when it is unique; when it is not, the command lists the candidates and stops.

## The gates

- Every injury starts the clocks that apply to its site: insurer notice within 48 hours of becoming aware in NSW (1998 Act s 44) or 8 business days in Queensland (WCRA 2003 s 133(3)); the claim forwarded within 7 days in NSW (s 261(1)) or 10 days in Victoria (WIRC Act s 73(1)); WorkSafe Victoria told of a mental injury claim within 3 business days; the register of injuries in NSW (s 63) and Victoria; the regulator told of a notifiable incident (WHS Act s 38, HSWA s 56). A deadline met late stays on the record as late.
- An ACC Accredited Employer has 21 days from lodgement to decide cover (Accident Compensation Act 2001 s 56). Past that, cover is deemed (s 58): `/liability` refuses to decline it and the decision letter says so. First week compensation at 80% is flagged until it is paid (s 98).
- `/weekly` applies the statutory step-down: NSW weeks 1 to 13 at 95% of PIAWE, weeks 14 to 130 at 95% if working 15 hours or more and 80% if not (1987 Act ss 36 and 37); Victoria 95% then 80% of PIAWE less earnings; ACC 80%. It caps at the indexed maximum once you set it, and returns no figure where it has no rule, rather than a guess.
- `/add-plan` refuses a plan on a no-capacity certificate and hours above what the certificate allows. `/certificate` refuses suitable capacity without the restrictions.
- `/pay` refuses weekly compensation for a period already paid, an invoice already paid, and weekly payments on a declined claim. `/close-claim` refuses while a legal deadline is open.
- Injuries, claims, certificates, payments and case notes cannot be deleted, and the activity log cannot be rewritten.

The software records and checks; the insurer, the agent, the accredited employer and the doctor decide. It is not legal or medical advice, and it sends nothing.

## Ten questions answered from your records

`/insights` runs all ten today.

1. What has each mechanism of injury cost this year, paid and estimated, by site?
2. How many hours from becoming aware to telling the insurer, by site?
3. Which legal deadlines were missed or met late in the last 12 months, by site and rule?
4. How many days from the first certificate to full capacity, by nature of injury, on closed claims?
5. Which open claims have been on no capacity longest without a step back?
6. How much money is waiting to be reimbursed, by insurer, and how old is it?
7. Which workers have been injured more than once in two years?
8. Which body parts get hurt most at each site, and how?
9. Which open claims have gone quiet, and what is estimated on them?
10. Which weekly claims step down from 95% to 80% in the next 30 days?

## Your first hour: ten things to ask for

1. What needs my attention today?
2. Josh hurt his back lifting cartons at Wetherill Park this morning. Record it and tell me what is due when.
3. Draft the injury notice to icare for Josh.
4. Priya's new certificate says suitable duties, 25 hours, no overhead reach, for three weeks. Record it.
5. What should Tom be paid this week?
6. Draft a plan for Priya: label checking, five hours a day, review in two weeks.
7. Daniel's claim has been sitting for 24 days. Where do we stand?
8. Draft the cover decision letter for Daniel.
9. How much is the Victorian agent holding of ours, and since when?
10. Add a field for the injury management consultant on every claim through `/customise`.

## Verification

`npm test` runs every command on a temporary database with the demo business: migrations, repeatable seed data, the NSW 48-hour and Queensland 8-business-day insurer notices, the NSW 7-day and Victorian 10-day claim forwarding, the Victorian mental injury notice, the NSW register, notifiable incidents, deemed cover after 21 days and the refusal to decline it, first week compensation, the NSW and Victorian step-down rates and the indexed maximum, plans refused above the certificate, payments never twice, reimbursements, claims that cannot close with a deadline open, Solv imports with dry run, repeats and rollback, drafts, export, the append-only activity log, database checks, views, documents and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Instead of Solv

Export your employees, injuries and claims from Solv's reports as comma-separated files, then import them in that order, dry run first:

```bash
node scripts/claims.mjs import solv employees.csv --kind=workers --actor="Your name" --dry-run
node scripts/claims.mjs import solv injuries.csv --kind=injuries --actor="Your name" --dry-run
node scripts/claims.mjs import solv claims.csv --kind=claims --actor="Your name" --dry-run
```

The [switching guide](docs/replace-solv.md) covers the headings it reads, `--map` for reports with other headings, what comes across and what does not. Imports are atomic: repeat rows are skipped and one bad row stops the whole file.

## Architecture

```
injury-claims-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Injury Claims for Claude Code for your business, migrates your Solv data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=solv)
- Read more: [enterprisedna.co/omni/instead-of/solv](https://enterprisedna.co/omni/instead-of/solv?utm_source=github&utm_medium=readme&utm_campaign=solv)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
