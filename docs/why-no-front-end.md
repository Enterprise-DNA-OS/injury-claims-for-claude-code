# Why there is no front end

Solv is a database with a subscription. The tables underneath it are ordinary: a few entities, a few relationships, a handful of workflows you repeat every week. What you pay for is the layer on top that lets people who do not write SQL get at those tables. Screens, filters, dashboards, forms.

That layer used to be the whole product, because talking to a database was hard. It is not hard any more. Open this folder in Claude Code, describe what you want, and it writes the query, runs it, and explains the answer. Ask a question the dashboard never had a chart for and you still get an answer.

## What you gain

- **Better answers.** A dashboard shows what the vendor decided to chart. Here you ask your own question, in your own words, and get it answered against your own data.
- **No seats.** Everyone who needs to look can look. The bill does not grow with headcount.
- **Your data in your Postgres.** Plain tables. Back them up, query them from anything, leave any time. There is no export step because there is nothing to leave.
- **A process that matches you.** When your way of working changes, you add a command. You do not wait for a feature request to clear.

## What you give up

- **A form for supervisors.** A supervisor reporting an injury from the floor on a phone needs a form; here the coordinator records it from the incident report. Enterprise DNA builds that form into a customer's version.
- **The insurer feed.** Solv sends new injuries to icare and takes claim numbers back. Here the claim number is recorded from the insurer's email or portal.
- **Regulator submission files.** Self-insurers send the regulator files in its own format. The records are all here; the file format is part of a custom build.
- **A vendor help desk.** This is open source. Enterprise DNA supports the installed version for businesses that want someone to call.

## Who this fits

A return to work coordinator or a small claims team who would rather ask than click, at an insured employer, a self-insurer or an ACC Accredited Employer. If dozens of supervisors log injuries into it every day and nobody will ask Claude Code anything, keep Solv or have the form built. If you need the answers more than the screens, this is cheaper, faster and yours.

Installed and run for you: https://enterprisedna.co/omni/instead-of/solv
