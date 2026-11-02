# Rules and sources

Each rule the system checks, where it comes from, what a breach looks like in the records, and where the check lives. `/compliance` runs them all; `/attention` puts every breach first. These are records checks, not legal advice. Check them against the current legislation and your insurer's guidance before you rely on them, and when one changes, change the view and this page together.

Deadlines are counted from when the employer became aware of the injury (`aware_at`: when a supervisor or manager learned of it), or from the day the claim was received. "Within N days" means by the end of day N. Business days skip Saturdays and Sundays; public holidays are not known to the system, so a deadline that falls across one shows a day early, never late.

## Telling the insurer

| Rule | Source | Breach | Check |
|---|---|---|---|
| NSW: tell the insurer within 48 hours of becoming aware of a workplace injury. Weekends count. Single self-insurers are exempt. | Workplace Injury Management and Workers Compensation Act 1998 (NSW) s 44; SIRA, "What to do if a worker is injured" | An insured NSW site, a medical or lost-time injury, `insurer_notified_at` empty or more than 48 hours after `aware_at` | `v_deadlines` item `insurer notice` |
| Queensland: report an injury that may be compensable within 8 business days of becoming aware, whether or not a claim is made. | Workers' Compensation and Rehabilitation Act 2003 (Qld) s 133(3); WorkSafe Queensland, "Reporting injuries" | An insured Queensland site, a medical or lost-time injury, not reported within 8 business days | `v_deadlines` item `insurer notice` |

## Forwarding the claim

| Rule | Source | Breach | Check |
|---|---|---|---|
| NSW: forward claim documents to the insurer within 7 days of receiving them (not self-insurers). | 1998 Act (NSW) s 261(1) | `forwarded_on` empty or more than 7 days after `received_on` | `claim to insurer` |
| Victoria: forward a claim for weekly payments, and its certificate, to the agent within 10 days of receiving it. | Workplace Injury Rehabilitation and Compensation Act 2013 (Vic) s 73(1); WorkSafe Victoria Claims Manual 2.3 | `forwarded_on` empty or more than 10 days after `received_on` | `claim to agent` |
| Victoria: tell WorkSafe within 3 business days of receiving a claim for a mental injury, as well as forwarding it. | WIRC Act 2013 (Vic); WorkSafe Victoria Claims Manual 2.2.7 | `authority_notified_on` empty or late on a mental injury claim | `mental injury notice` |

## Decisions

| Rule | Source | Breach | Check |
|---|---|---|---|
| NSW: within 7 days of notification the insurer starts provisional weekly payments, gives a reasonable excuse, or decides liability. A self-insurer carries this itself. | 1998 Act (NSW) s 267; SIRA Guidance note 3.2 | A weekly NSW claim with no decision 7 days after notification. Law for a self-insurer; a chase for an insured site | `7-day decision` / `insurer 7-day decision` |
| Victoria: the agent decides weekly payments within 28 days of receiving the claim, or the claim is deemed accepted. | WIRC Act 2013 (Vic) s 75 | No decision 28 days after `forwarded_on`. A chase: it is the agent's duty | `agent 28-day decision` |
| New Zealand, ACC Accredited Employer: decide cover within 21 days of lodgement (2 months if the claim is complicated and the claimant is told). Miss it and cover is deemed from the day the time ran out. | Accident Compensation Act 2001 ss 56, 57 and 58; ACC Cover decision timeframes policy; ACC AEP Assessment Guidelines | A pending claim more than 21 days after `received_on` shows as `deemed`. `/liability` refuses to decline it | `cover decision` |

The 2-month limit for a complicated claim needs the claimant told within the 21 days. The system does not track that notice: if you gave it, record the decision when you make it and note the extension in the case notes. Ask Claude Code to add the extension through `/customise` if you use it often.

## Paying

| Rule | Source | Breach | Check |
|---|---|---|---|
| New Zealand: the employer pays first week compensation for a work injury, 80% of the earnings lost in the first 7 days of incapacity, on the usual pay day. It cannot be taken from sick or annual leave. | Accident Compensation Act 2001 ss 97 and 98 | A weekly NZ claim with no `first-week` payment 14 days after incapacity began | `first week compensation` |
| NSW weekly rate: weeks 1 to 13, 95% of PIAWE less current earnings; weeks 14 to 130, 95% if working 15 hours or more a week, otherwise 80%, less earnings; capped at the indexed maximum. | Workers Compensation Act 1987 (NSW) ss 36 and 37; SIRA, "Weekly payments" | Not a breach check: `/weekly` works it out | `weekly_rate_pct`, `weekly_amount_cents` |
| Victoria weekly rate: first entitlement period (weeks 1 to 13), 95% of PIAWE less current earnings; second (weeks 14 to 130), 80% of PIAWE less earnings; capped at the indexed maximum. The employer pays the first 10 days off work and medical costs up to the indexed excess. | WIRC Act 2013 (Vic), Part 5; WorkSafe Victoria, "Payments by the employer" | Not a breach check | as above; the excess is recorded as non-reimbursable payments |
| New Zealand weekly rate: 80% of weekly earnings before incapacity. ACC abates it for earnings after the injury, so `/weekly` gives no figure when the worker is earning. | Accident Compensation Act 2001, Schedule 1 | Not a breach check | as above |

The indexed maximums change every year. Set them with `/set max_weekly_cents_nsw <cents>` (and `_vic`, `_nz`) from the regulator's current figure. Queensland, WA, SA, Tasmania, the territories and Comcare have no rate built in: `/weekly` says so rather than guessing, and you record what the insurer pays.

## Records

| Rule | Source | Breach | Check |
|---|---|---|---|
| NSW: keep a register of injuries at each workplace. Workers can record any injury, claim or not. | 1998 Act (NSW) s 63; SafeWork NSW register template SW09110 | A NSW injury not entered by the end of the next day | `register of injuries` |
| Victoria: keep a register of injuries. | WIRC Act 2013 (Vic); WorkSafe Victoria Claims Manual 5.3.5 | As above for Victoria | `register of injuries` |
| Notifiable incidents (a death, a serious injury or illness, a dangerous incident): tell the regulator immediately and keep the record for at least 5 years. | Work Health and Safety Act 2011 (model) ss 35 to 38; Occupational Health and Safety Act 2004 (Vic) s 38; Health and Safety at Work Act 2015 (NZ) ss 56 and 57 | A notifiable injury with no regulator notice within 24 hours of becoming aware | `regulator notice` |

Injury and claim records cannot be deleted (a database trigger refuses), so the 5-year record and the register are always whole.

## Not checked

- Return to work coordinator appointment, the return to work program on display, and suitable duties offered within the employer's obligation period. These are policies, not records.
- WA, SA, Tasmania, ACT, NT and Comcare claim deadlines. The schedules differ; add them with `/customise` and a source when you have sites there.
- Insurer and regulator portals. The system records what was sent, when, and the reference; it does not send.
