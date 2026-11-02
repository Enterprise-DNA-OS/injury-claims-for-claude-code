# Moving from Solv

Bring your workers, injuries and claims across in an afternoon. Do a dry run first: it counts what would come across and keeps nothing.

## 1. Set up your sites

Imports need somewhere to land. Add each site with the jurisdiction and the arrangement it sits under:

```bash
node scripts/claims.mjs add-site --code=SYD --name="Wetherill Park" --jurisdiction=NSW --arrangement=insured --insurer="icare NSW" --coordinator="Leah Morgan" --actor="Your name"
node scripts/claims.mjs add-site --code=AKL --name="East Tamaki" --jurisdiction=NZ --arrangement=accredited --actor="Your name"
```

Use the codes or names your Solv sites or business units already carry, so the employee export finds them. Arrangement is `insured`, `self-insured` (a state licence or Comcare) or `accredited` (ACC Accredited Employers Programme).

## 2. Export from Solv

Solv exports injury and claim lists from its reports and whole case files from a claim. From its reporting, export three comma-separated files:

- **Employees:** Employee ID, First Name and Last Name (or Employee Name), Date of Birth, Occupation, Site, Start Date, PIAWE.
- **Injuries:** Injury Number, Employee ID, Date of Injury, Time of Injury, Date Reported, Mechanism of Incident, Nature of Injury, Bodily Location, Injury Classification, Description.
- **Claims:** Injury Number, Claim Number, Claim Received, Liability Status, Liability Date, First Day Off, Claim Status, Date Closed, Case Estimate, Case Manager.

Dates can be `YYYY-MM-DD` or day first (`21/10/2026`). `examples/solv/` has a small example of each. Solv's report builder lets you choose and rename columns, so the headings in your export may differ: the import reads the common alternatives (for example `Incident Number`, `Body Part`, `Determination`), and `--map` covers the rest.

## 3. Import, dry run first

```bash
node scripts/claims.mjs import solv employees.csv --kind=workers --actor="Your name" --dry-run
node scripts/claims.mjs import solv employees.csv --kind=workers --actor="Your name"
node scripts/claims.mjs import solv injuries.csv --kind=injuries --actor="Your name"
node scripts/claims.mjs import solv claims.csv --kind=claims --actor="Your name"
```

Workers first, then injuries, then claims: each finds the one before it. Pass `--site=<code>` when the employee export has no site column. Run the same file twice and the repeats are skipped. One bad row stops the whole file and nothing is kept; the error names the row.

If a heading is different, write a small map and pass it:

```json
{ "id": "Incident Ref", "body": "Part of Body Injured" }
```

```bash
node scripts/claims.mjs import solv injuries.csv --kind=injuries --map=map.json --actor="Your name"
```

The fields you can map are listed in `scripts/lib/domain.mjs` under `MAPS`.

## What comes across

- Workers with their site, role, start date and pre-injury average weekly earnings.
- Injuries with when and how they happened, the nature and body part, and the classification (lost time, medical treatment, first aid). History comes across as already registered and already notified to the insurer, because Solv held those steps, so the attention list starts clean.
- Claims with the claim number, when it was received, the liability decision and date, the first day off work (which marks it as a weekly claim), the estimate, the case manager, and whether it is closed.

## What does not

- Certificates of capacity, return to work plans, payments and case notes. Solv's case file export is a document bundle, not a table. For open claims, record the current certificate and plan with `/certificate` and `/add-plan` as you pick each claim up, or ask Enterprise DNA to bring the full history across as part of the setup.
- Regulator submission files for self-insurers. The records they are built from come across; the file format each regulator wants is part of a custom build.
- The insurer feed (Solv's link with icare). Here the claim number and decision are recorded from the insurer's email or portal.

## Check it

```bash
node scripts/claims.mjs claims --open
node scripts/claims.mjs attention
node scripts/claims.mjs register --site=SYD
```

Spot-check five claims against Solv before you stop using it. Keep your Solv export files somewhere safe and out of Git: they hold health information.
