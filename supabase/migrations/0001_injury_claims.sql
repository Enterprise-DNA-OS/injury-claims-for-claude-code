-- Injury Claims for Claude Code: workplace injuries and workers' compensation claims in plain tables.
-- Sites and the scheme each sits under, workers, injuries, claims, certificates of capacity, return
-- to work plans, payments and reimbursements, follow-up actions, case notes and an append-only
-- activity log. The rules each view applies, with their sources, are in docs/compliance.md.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Monday to Friday days after a date. Public holidays are not known here: docs/compliance.md.
create or replace function add_business_days(d date, n int) returns date language sql immutable as $$
  select coalesce(max(x)::date, d) from (
    select x from generate_series(d + 1, d + n * 2 + 7, interval '1 day') x
    where extract(isodow from x) < 6 order by x limit greatest(n, 0)
  ) s
$$;

-- End of the day a deadline falls on, so "within 10 days" means by midnight of day 10.
create or replace function end_of(d date) returns timestamp language sql immutable as $$
  select d::timestamp + interval '23 hours 59 minutes 59 seconds'
$$;

create table settings (
  key text primary key,
  value text not null,
  note text
);

create or replace function setting_num(k text, dflt numeric) returns numeric language sql stable as $$
  select coalesce((select value::numeric from settings where key = k), dflt)
$$;

create table sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null,
  jurisdiction text not null check (jurisdiction in ('NZ', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'CTH')),
  -- insured: a scheme insurer or agent holds the claim. self-insured: a licensed self-insurer (or
  -- Comcare licensee) holds it. accredited: an ACC Accredited Employer holds it.
  arrangement text not null check (arrangement in ('insured', 'self-insured', 'accredited')),
  insurer text,
  policy_number text,
  address text,
  rtw_coordinator text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (arrangement <> 'accredited' or jurisdiction = 'NZ')
);

create table workers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  site_id uuid not null references sites(id),
  name text not null,
  dob date,
  role text,
  email text,
  phone text,
  started_on date,
  hours_per_week numeric check (hours_per_week is null or (hours_per_week >= 0 and hours_per_week <= 100)),
  -- Pre-injury average weekly earnings (NSW and Victoria), or weekly earnings before incapacity (ACC).
  piawe_cents integer check (piawe_cents is null or piawe_cents >= 0),
  status text not null default 'active' check (status in ('active', 'left')),
  left_on date,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table injuries (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  worker_id uuid not null references workers(id),
  site_id uuid not null references sites(id),
  occurred_at timestamp not null,
  aware_at timestamp not null,
  reported_by text,
  location text,
  mechanism text not null,
  nature text not null,
  body_part text,
  description text,
  mental boolean not null default false,
  severity text not null check (severity in ('report-only', 'first-aid', 'medical', 'lost-time')),
  notifiable boolean not null default false,
  regulator_notified_at timestamp,
  regulator_ref text,
  insurer_notified_at timestamp,
  registered_on date,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (aware_at >= occurred_at),
  check (regulator_notified_at is null or notifiable),
  check (insurer_notified_at is null or insurer_notified_at >= occurred_at)
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  injury_id uuid not null unique references injuries(id),
  claim_number text,
  received_on date not null,
  weekly boolean not null default false,
  incapacity_from date,
  forwarded_on date,
  authority_notified_on date,
  liability text not null default 'pending' check (liability in ('pending', 'provisional', 'reasonable-excuse', 'accepted', 'declined', 'deemed')),
  liability_on date,
  estimate_cents integer check (estimate_cents is null or estimate_cents >= 0),
  case_manager text,
  treating_doctor text,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_on date,
  closed_reason text,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'closed') = (closed_on is not null)),
  check (liability = 'pending' or liability_on is not null),
  check (not weekly or incapacity_from is not null),
  check (forwarded_on is null or forwarded_on >= received_on)
);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  claim_id uuid not null references claims(id),
  issued_on date not null,
  from_on date not null,
  to_on date not null,
  capacity text not null check (capacity in ('full', 'suitable', 'none')),
  hours_per_week numeric check (hours_per_week is null or (hours_per_week >= 0 and hours_per_week <= 100)),
  restrictions text,
  doctor text,
  created_at timestamptz not null default now(),
  check (to_on >= from_on),
  check (capacity <> 'suitable' or restrictions is not null)
);

create table rtw_plans (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  claim_id uuid not null references claims(id),
  starts_on date not null,
  review_on date not null,
  duties text not null,
  hours_per_week numeric,
  status text not null default 'draft' check (status in ('draft', 'agreed', 'ended')),
  agreed_on date,
  agreed_by text,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (review_on >= starts_on),
  check (status = 'draft' or agreed_on is not null),
  check ((status = 'ended') = (ended_on is not null))
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  claim_id uuid not null references claims(id),
  kind text not null check (kind in ('first-week', 'weekly', 'medical', 'allied', 'travel', 'legal', 'other')),
  period_from date,
  period_to date,
  paid_on date not null,
  payee text not null,
  amount_cents integer not null check (amount_cents > 0),
  reimbursable boolean not null default false,
  reimbursed_on date,
  invoice_ref text,
  note text,
  created_at timestamptz not null default now(),
  check (period_to is null or period_from is not null and period_to >= period_from),
  check (reimbursed_on is null or reimbursable)
);

create table actions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  claim_id uuid references claims(id),
  injury_id uuid references injuries(id),
  what text not null,
  due_on date not null,
  done_on date,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (claim_id is not null or injury_id is not null),
  check (done_on is null or outcome is not null)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id),
  at timestamptz not null default now(),
  kind text not null check (kind in ('call', 'email', 'letter', 'meeting', 'note')),
  who text,
  body text not null,
  actor text not null
);

create table activity (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  ref text,
  detail text
);

create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'The activity log is append-only';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

-- Claim records are kept, never deleted: a closed claim can reopen, and the register must be kept.
create or replace function records_kept() returns trigger language plpgsql as $$
begin
  raise exception 'Injury and claim records are kept, not deleted. Close the claim instead.';
end $$;
create trigger injuries_kept before delete on injuries for each row execute function records_kept();
create trigger claims_kept before delete on claims for each row execute function records_kept();
create trigger certificates_kept before delete on certificates for each row execute function records_kept();
create trigger payments_kept before delete on payments for each row execute function records_kept();
create trigger notes_kept before delete on notes for each row execute function records_kept();

create trigger sites_touch before update on sites for each row execute function touch_updated_at();
create trigger workers_touch before update on workers for each row execute function touch_updated_at();
create trigger injuries_touch before update on injuries for each row execute function touch_updated_at();
create trigger claims_touch before update on claims for each row execute function touch_updated_at();
create trigger plans_touch before update on rtw_plans for each row execute function touch_updated_at();
create trigger actions_touch before update on actions for each row execute function touch_updated_at();

do $$
declare t text;
begin
  foreach t in array array['settings', 'sites', 'workers', 'injuries', 'claims', 'certificates', 'rtw_plans', 'payments', 'actions', 'notes', 'activity'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;

create index injuries_worker on injuries (worker_id);
create index certificates_claim on certificates (claim_id, to_on desc);
create index payments_claim on payments (claim_id);
create index notes_claim on notes (claim_id, at desc);

-- The statutory weekly rate, as a percentage of pre-injury earnings, for the week of incapacity.
-- NSW: Workers Compensation Act 1987 s 36 (weeks 1 to 13, 95%) and s 37 (weeks 14 to 130: 95% when
-- working 15 hours or more a week, otherwise 80%). Victoria: WIRC Act 2013 first entitlement period
-- (weeks 1 to 13, 95%) and second (weeks 14 to 130, 80%). New Zealand: Accident Compensation Act
-- 2001, 80% (s 98 for the first week, then ACC or the accredited employer). Elsewhere: null, so the
-- operator sets the scheme's rate rather than this system guessing.
create or replace function weekly_rate_pct(jurisdiction text, week_no int, hours_worked numeric) returns numeric language sql immutable as $$
  select case
    when week_no is null or week_no < 1 then null
    when jurisdiction = 'NSW' then case when week_no <= 13 then 95 when week_no <= 130 then case when coalesce(hours_worked, 0) >= 15 then 95 else 80 end end
    when jurisdiction = 'VIC' then case when week_no <= 13 then 95 when week_no <= 130 then 80 end
    when jurisdiction = 'NZ' then 80
  end::numeric
$$;

-- The weekly amount before the scheme's indexed maximum, in cents. NSW: rate x PIAWE less current
-- earnings. Victoria: weeks 1 to 13, 95% x PIAWE less current earnings; weeks 14 to 130, 80% of
-- (PIAWE less current earnings). New Zealand with no earnings: 80%; with earnings ACC abates the
-- amount, so this returns null and the operator records the figure ACC or the claims manager sets.
create or replace function weekly_amount_cents(jurisdiction text, week_no int, piawe_cents int, earnings_cents int, hours_worked numeric) returns integer language sql stable as $$
  select case
    when piawe_cents is null or weekly_rate_pct(jurisdiction, week_no, hours_worked) is null then null
    when jurisdiction = 'NZ' and coalesce(earnings_cents, 0) > 0 then null
    else least(
      greatest(0, round(case
        when jurisdiction = 'VIC' and week_no > 13 then 0.80 * (piawe_cents - coalesce(earnings_cents, 0))
        else weekly_rate_pct(jurisdiction, week_no, hours_worked) / 100.0 * piawe_cents - coalesce(earnings_cents, 0)
      end)),
      coalesce(setting_num('max_weekly_cents_' || lower(jurisdiction), null), 2147483647)
    )::int
  end
$$;

create or replace function regulator_of(jurisdiction text) returns text language sql immutable as $$
  select case jurisdiction
    when 'NZ' then 'WorkSafe New Zealand' when 'NSW' then 'SafeWork NSW' when 'VIC' then 'WorkSafe Victoria'
    when 'QLD' then 'Workplace Health and Safety Queensland' when 'WA' then 'WorkSafe WA' when 'SA' then 'SafeWork SA'
    when 'TAS' then 'WorkSafe Tasmania' when 'ACT' then 'WorkSafe ACT' when 'NT' then 'NT WorkSafe' when 'CTH' then 'Comcare'
  end
$$;

-- Every claim with where it stands: the latest certificate, the current plan, money paid.
create view v_claims as
select c.id, c.ref, c.claim_number, c.status, c.liability, c.liability_on, c.received_on, c.weekly, c.incapacity_from, c.forwarded_on,
  c.estimate_cents, c.case_manager, c.treating_doctor, c.closed_on, c.closed_reason,
  i.id as injury_id, i.ref as injury_ref, i.occurred_at::date as injured_on, i.mechanism, i.nature, i.body_part, i.mental, i.severity,
  w.id as worker_id, w.code as worker_code, w.name as worker, w.piawe_cents, w.hours_per_week as usual_hours,
  s.id as site_id, s.code as site, s.jurisdiction, s.arrangement, s.insurer, s.rtw_coordinator,
  case when s.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency,
  cert.ref as cert_ref, cert.capacity, cert.to_on as cert_to, cert.hours_per_week as cert_hours, cert.restrictions,
  case
    when cert.id is null then case when c.weekly then 'no certificate' else 'not needed' end
    when cert.capacity = 'full' then 'fit'
    when cert.to_on < current_date then 'expired'
    when cert.to_on <= current_date + 3 then 'expiring'
    else 'current'
  end as cert_standing,
  plan.ref as plan_ref, plan.status as plan_status, plan.review_on as plan_review_on,
  coalesce(paid.total, 0)::int as paid_cents,
  coalesce(paid.awaiting, 0)::int as awaiting_reimbursement_cents,
  case when c.incapacity_from is null then null else ((least(coalesce(c.closed_on, current_date), current_date) - c.incapacity_from) / 7 + 1)::int end as week_no,
  (coalesce(c.closed_on, current_date) - c.received_on)::int as days_open,
  last_note.at as last_note_at
from claims c
join injuries i on i.id = c.injury_id
join workers w on w.id = i.worker_id
join sites s on s.id = i.site_id
left join lateral (select * from certificates x where x.claim_id = c.id order by x.from_on desc, x.issued_on desc limit 1) cert on true
left join lateral (select * from rtw_plans p where p.claim_id = c.id and p.status <> 'ended' order by p.starts_on desc limit 1) plan on true
left join lateral (select sum(amount_cents) as total, sum(amount_cents) filter (where reimbursable and reimbursed_on is null) as awaiting from payments p where p.claim_id = c.id) paid on true
left join lateral (select max(n.at) as at from notes n where n.claim_id = c.id) last_note on true;

-- Every deadline the law sets on an injury or a claim, with the rule behind it and where it stands.
create view v_deadlines as
with d as (
  -- NSW: employer notifies the insurer within 48 hours of becoming aware (1998 Act s 44).
  select 'insurer notice' as item, 'law' as basis, i.ref, s.jurisdiction, i.id as injury_id, null::uuid as claim_id,
    i.aware_at + interval '48 hours' as due_at, i.insurer_notified_at as done_at,
    'NSW Workplace Injury Management and Workers Compensation Act 1998 s 44: tell the insurer within 48 hours of becoming aware' as rule
  from injuries i join sites s on s.id = i.site_id
  where s.jurisdiction = 'NSW' and s.arrangement = 'insured' and i.severity in ('medical', 'lost-time')
  union all
  -- Queensland: report an injury that may be compensable within 8 business days (WCRA 2003 s 133(3)).
  select 'insurer notice', 'law', i.ref, s.jurisdiction, i.id, null,
    end_of(add_business_days(i.aware_at::date, 8)), i.insurer_notified_at,
    'Qld Workers'' Compensation and Rehabilitation Act 2003 s 133(3): report to the insurer within 8 business days of becoming aware'
  from injuries i join sites s on s.id = i.site_id
  where s.jurisdiction = 'QLD' and s.arrangement = 'insured' and i.severity in ('medical', 'lost-time')
  union all
  -- NSW: claim documents to the insurer within 7 days (1998 Act s 261(1)).
  select 'claim to insurer', 'law', c.ref, s.jurisdiction, i.id, c.id,
    end_of(c.received_on + 7), c.forwarded_on::timestamp,
    'NSW Workplace Injury Management and Workers Compensation Act 1998 s 261(1): forward the claim within 7 days'
  from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id
  where s.jurisdiction = 'NSW' and s.arrangement = 'insured'
  union all
  -- Victoria: a claim for weekly payments goes to the agent within 10 days (WIRC Act 2013 s 73(1)).
  select 'claim to agent', 'law', c.ref, s.jurisdiction, i.id, c.id,
    end_of(c.received_on + 10), c.forwarded_on::timestamp,
    'Vic Workplace Injury Rehabilitation and Compensation Act 2013 s 73(1): forward the claim and certificate to the agent within 10 days'
  from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id
  where s.jurisdiction = 'VIC' and s.arrangement = 'insured' and c.weekly
  union all
  -- Victoria: a mental injury claim is notified to WorkSafe within 3 business days.
  select 'mental injury notice', 'law', c.ref, s.jurisdiction, i.id, c.id,
    end_of(add_business_days(c.received_on, 3)), c.authority_notified_on::timestamp,
    'Vic WIRC Act 2013: notify WorkSafe within 3 business days of receiving a mental injury claim'
  from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id
  where s.jurisdiction = 'VIC' and i.mental
  union all
  -- NSW self-insurer: start provisional payments, give a reasonable excuse or decide within 7 days (s 267).
  select case when s.arrangement = 'insured' then 'insurer 7-day decision' else '7-day decision' end, case when s.arrangement = 'insured' then 'chase' else 'law' end,
    c.ref, s.jurisdiction, i.id, c.id,
    case when s.arrangement = 'insured' then coalesce(i.insurer_notified_at, i.aware_at) else i.aware_at end + interval '7 days',
    c.liability_on::timestamp,
    'NSW 1998 Act s 267: provisional weekly payments, a reasonable excuse or a liability decision within 7 days of notification'
  from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id
  where s.jurisdiction = 'NSW' and c.weekly
  union all
  -- Victoria: the agent decides weekly payments within 28 days or the claim is deemed accepted (s 75).
  select 'agent 28-day decision', 'chase', c.ref, s.jurisdiction, i.id, c.id,
    end_of(c.forwarded_on + 28), c.liability_on::timestamp,
    'Vic WIRC Act 2013 s 75: the agent decides within 28 days of receiving the claim, or it is deemed accepted'
  from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id
  where s.jurisdiction = 'VIC' and s.arrangement = 'insured' and c.weekly and c.forwarded_on is not null
  union all
  -- New Zealand accredited employer: decide cover within 21 days of lodgement or cover is deemed (ss 56 to 58).
  select 'cover decision', 'law', c.ref, s.jurisdiction, i.id, c.id,
    end_of(c.received_on + 21), case when c.liability <> 'pending' then c.liability_on::timestamp end,
    'Accident Compensation Act 2001 ss 56 and 58: decide cover within 21 days of lodgement (2 months if complicated under s 57) or cover is deemed'
  from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id
  where s.arrangement = 'accredited'
  union all
  -- New Zealand: the employer pays first week compensation for a work injury (s 98).
  select 'first week compensation', 'law', c.ref, s.jurisdiction, i.id, c.id,
    end_of(c.incapacity_from + 14), (select min(p.paid_on)::timestamp from payments p where p.claim_id = c.id and p.kind = 'first-week'),
    'Accident Compensation Act 2001 s 98: the employer pays 80% of earnings for the first week of incapacity, on the usual pay day'
  from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id
  where s.jurisdiction = 'NZ' and c.weekly and c.liability not in ('declined')
  union all
  -- Notifiable incidents: tell the regulator immediately (WHS Act s 38, HSWA s 56).
  select 'regulator notice', 'law', i.ref, s.jurisdiction, i.id, null,
    i.aware_at + interval '24 hours', i.regulator_notified_at,
    case when s.jurisdiction = 'NZ' then 'Health and Safety at Work Act 2015 s 56: notify WorkSafe as soon as possible after becoming aware of a notifiable event'
      else 'Work Health and Safety Act s 38 (OHS Act 2004 s 38 in Victoria): notify the regulator immediately after becoming aware of a notifiable incident' end
  from injuries i join sites s on s.id = i.site_id
  where i.notifiable
  union all
  -- NSW and Victoria: every injury goes in the register of injuries (NSW 1998 Act s 63; Vic WIRC Act).
  select 'register of injuries', 'law', i.ref, s.jurisdiction, i.id, null,
    end_of(i.aware_at::date + 1), i.registered_on::timestamp,
    case when s.jurisdiction = 'NSW' then 'NSW 1998 Act s 63: keep a register of injuries at each workplace' else 'Vic WIRC Act 2013: keep a register of injuries' end
  from injuries i join sites s on s.id = i.site_id
  where s.jurisdiction in ('NSW', 'VIC')
)
select d.*, w.code as worker_code, w.name as worker, st.code as site,
  d.due_at::date as due_on,
  case
    when d.done_at is not null then case when d.done_at <= d.due_at then 'done' else 'done late' end
    when d.item = 'cover decision' and now() > d.due_at then 'deemed'
    when now() > d.due_at then 'overdue'
    when d.due_at - now() <= interval '2 days' then 'due soon'
    else 'open'
  end as standing
from d
join injuries i on i.id = d.injury_id
join workers w on w.id = i.worker_id
join sites st on st.id = i.site_id
left join claims c on c.id = d.claim_id
where d.done_at is not null or coalesce(c.status, 'open') <> 'closed';

-- The register of injuries: every injury, claim or not, in the order it happened.
create view v_register as
select i.ref, s.code as site, s.jurisdiction, i.occurred_at, w.name as worker, w.role, i.location, i.mechanism, i.nature, i.body_part,
  i.severity, i.reported_by, i.aware_at, i.registered_on, i.notifiable, i.regulator_notified_at, i.regulator_ref, c.ref as claim_ref, c.liability, i.id, s.id as site_id
from injuries i join sites s on s.id = i.site_id join workers w on w.id = i.worker_id
left join claims c on c.injury_id = i.id;

-- Money paid that the insurer or agent owes back (Victoria above the employer excess, or an insurer
-- that reimburses wages paid by the employer).
create view v_reimbursements as
select p.ref, c.ref as claim_ref, w.name as worker, s.code as site, s.insurer, p.kind, p.period_from, p.period_to, p.paid_on,
  p.amount_cents, case when s.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency, p.reimbursed_on,
  case when p.reimbursed_on is not null then 'reimbursed' when current_date - p.paid_on > setting_num('reimburse_chase_days', 30) then 'chase' else 'waiting' end as standing,
  (coalesce(p.reimbursed_on, current_date) - p.paid_on)::int as days
from payments p join claims c on c.id = p.claim_id join injuries i on i.id = c.injury_id
join workers w on w.id = i.worker_id join sites s on s.id = i.site_id
where p.reimbursable;
