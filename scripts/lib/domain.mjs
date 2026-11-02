// The rules of the injury and claims desk. scripts/claims.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
// Dates are calendar dates (YYYY-MM-DD); moments are "YYYY-MM-DD HH:MM". The rules and their
// sources are in docs/compliance.md.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick, yesNo } from './csv.mjs';
import { price as money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  return s;
}
const pastDate = (v, label) => {
  const d = v === undefined || v === true ? today() : date(v, label);
  if (d > today()) throw Error(`--${label} cannot be in the future: record it once it has happened`);
  return d;
};

// "2026-10-21 08:30" (or with a T) -> "2026-10-21 08:30:00".
export function stamp(v, label) {
  const s = String(v ?? '').trim().replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})(?::00)?$/);
  if (!m) throw Error(`--${label} must be a date and time like 2026-10-21 08:30`);
  date(m[1], label);
  const h = Number(m[2]);
  if (h > 23 || Number(m[3]) > 59) throw Error(`--${label} has an impossible time`);
  return `${m[1]} ${String(h).padStart(2, '0')}:${m[3]}:00`;
}
const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ') + ':00';
const pastStamp = (v, label) => {
  const s = v === undefined || v === true ? nowStamp() : stamp(v, label);
  if (s.slice(0, 10) > today()) throw Error(`--${label} cannot be in the future: record it once it has happened`);
  return s;
};

// "1450.00" or "$1,450" -> 145000 cents. Never guesses at a blank.
export function cents(v, label) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 1450.00`);
  return Math.round(parseFloat(s) * 100);
}

function num(v, label, { min = 0, max = Infinity } = {}) {
  const n = Number(v);
  if (v === undefined || v === true || String(v).trim() === '' || !Number.isFinite(n) || n < min || n > max) throw Error(`--${label} must be a number from ${min} to ${max}`);
  return n;
}
function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
const text = (v) => (v === undefined || v === true ? null : String(v).trim() || null);
const flag = (v) => v === true || ['yes', 'true', '1'].includes(String(v ?? '').toLowerCase());

export const JURISDICTIONS = ['NZ', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'CTH'];
const ARRANGEMENTS = ['insured', 'self-insured', 'accredited'];
const SEVERITIES = ['report-only', 'first-aid', 'medical', 'lost-time'];
const CAPACITIES = ['full', 'suitable', 'none'];
const DECISIONS = ['provisional', 'reasonable-excuse', 'accepted', 'declined'];
const PAY_KINDS = ['first-week', 'weekly', 'medical', 'allied', 'travel', 'legal', 'other'];
const NOTE_KINDS = ['call', 'email', 'letter', 'meeting', 'note'];

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function log(db, actor, action, ref, detail) {
  await db.query('insert into activity (actor, action, ref, detail) values ($1,$2,$3,$4)', [actor, action, ref, detail]);
}
function actorOf(flags) {
  need(flags, 'actor');
  return String(flags.actor).trim();
}
async function nextRef(db, table, prefix, width) {
  const [r] = await db.query(`select coalesce(max(substring(ref from '[0-9]+$')::int), 0) + 1 as n from ${table} where ref ~ $1`, [`^${prefix}[0-9]+$`]);
  return `${prefix}${String(r.n).padStart(width, '0')}`;
}

// Resolve one record from a code, reference, id or name. Exact (case-insensitive) beats partial;
// more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export const site = async (db, term) => choose(await db.query('select * from sites order by code'), term, 'Site', (r) => [r.code, r.name, r.id]);
export const worker = async (db, term) => choose(await db.query('select w.*, s.code as site, s.jurisdiction from workers w join sites s on s.id = w.site_id order by w.code'), term, 'Worker', (r) => [r.code, r.name, r.id]);
export const injury = async (db, term) => choose(await db.query(`select i.*, w.name as worker, w.code as worker_code, s.code as site, s.jurisdiction, s.arrangement, s.insurer
  from injuries i join workers w on w.id = i.worker_id join sites s on s.id = i.site_id order by i.ref`), term, 'Injury', (r) => [r.ref, r.worker, r.id]);
// A claim by its ref, the insurer's claim number, or the worker's name.
export const claim = async (db, term) => choose(await db.query('select * from v_claims order by ref'), term, 'Claim', (r) => [r.ref, r.claim_number, r.worker, r.id]);
const plan = async (db, term) => choose(await db.query('select p.*, c.ref as claim_ref from rtw_plans p join claims c on c.id = p.claim_id order by p.ref'), term, 'Plan', (r) => [r.ref, r.id]);
const payment = async (db, term) => choose(await db.query('select * from payments order by ref'), term, 'Payment', (r) => [r.ref, r.invoice_ref, r.id]);
const action = async (db, term) => choose(await db.query('select * from actions order by ref'), term, 'Action', (r) => [r.ref, r.id]);
const setting = async (db, key, dflt) => Number((await db.query('select value from settings where key = $1', [key]))[0]?.value ?? dflt);

function draftFile(name, body) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, body, { mode: 0o600 });
  return path.relative(process.env.OUTPUT_DIR || REPO_ROOT, file).replace(/\\/g, '/');
}
const cur = (j) => (j === 'NZ' ? 'NZD' : 'AUD');

// ------------------------------------------------------------------ reads

const ATTENTION = `
  select 0 as rank, case when standing = 'deemed' then 'cover deemed: decision missed' else item || ' overdue' end as item, ref,
    worker || ' (' || site || '): due ' || to_char(due_at, 'YYYY-MM-DD HH24:MI') || '. ' || rule as detail
    from v_deadlines where basis = 'law' and standing in ('overdue', 'deemed')
  union all
  select 1, item || ' due soon', ref, worker || ' (' || site || '): due ' || to_char(due_at, 'YYYY-MM-DD HH24:MI') || '. ' || rule
    from v_deadlines where basis = 'law' and standing = 'due soon'
  union all
  select 2, case cert_standing when 'expired' then 'certificate expired' else 'no certificate' end, ref,
    worker || ' (' || site || ')' || coalesce(': last certificate ran out ' || cert_to, ': weekly claim with no certificate on file')
    from v_claims where status = 'open' and weekly and cert_standing in ('expired', 'no certificate')
  union all
  select 2, 'plan review missed', plan_ref, worker || ' (' || site || ') ' || ref || ': review was due ' || plan_review_on
    from v_claims where status = 'open' and plan_status = 'agreed' and plan_review_on < current_date
  union all
  select 2, 'no agreed plan', ref, worker || ' (' || site || '): suitable capacity since ' || cert_from || ', no return to work plan agreed'
    from (select c.*, (select min(x.from_on) from certificates x where x.claim_id = c.id and x.capacity = 'suitable'
      and x.from_on > coalesce((select max(y.to_on) from certificates y where y.claim_id = c.id and y.capacity = 'none'), '1900-01-01')) as cert_from
      from v_claims c where c.status = 'open' and c.capacity = 'suitable') s
    where coalesce(plan_status, 'none') <> 'agreed' and cert_from <= current_date - setting_num('rtw_plan_days', 10)::int
  union all
  select 3, 'chase ' || replace(item, ' decision', '') || ' decision', ref, worker || ' (' || site || '): no decision by ' || due_on || '. ' || rule
    from v_deadlines where basis = 'chase' and standing = 'overdue'
  union all
  select 3, 'reimbursement to chase', ref, worker || ' ' || claim_ref || ': ' || (amount_cents / 100.0)::numeric(12,2) || ' ' || currency || ' paid ' || paid_on || ', ' || days || ' days with ' || coalesce(insurer, 'the insurer')
    from v_reimbursements where standing = 'chase'
  union all
  select 3, 'certificate expiring', ref, worker || ' (' || site || '): ' || case capacity when 'none' then 'no' else capacity end || ' capacity to ' || cert_to
    from v_claims where status = 'open' and cert_standing = 'expiring'
  union all
  select 3, 'action overdue', a.ref, coalesce(c.ref, i.ref) || ': ' || a.what || ' (due ' || a.due_on || ')'
    from actions a left join claims c on c.id = a.claim_id left join injuries i on i.id = a.injury_id where a.done_on is null and a.due_on < current_date
  union all
  select 4, 'gone quiet', ref, worker || ' (' || site || '): no case note since ' || coalesce(to_char(last_note_at, 'YYYY-MM-DD'), 'the claim opened')
    from v_claims where status = 'open' and coalesce(last_note_at::date, received_on) < current_date - setting_num('quiet_days', 14)::int
  union all
  select 4, 'step-down coming', ref, worker || ' (' || site || '): week 14 starts ' || (incapacity_from + 91) || ', weekly rate drops from 95% to 80% of PIAWE'
    from v_claims where status = 'open' and weekly and jurisdiction in ('NSW', 'VIC') and capacity is distinct from 'full'
      and incapacity_from + 91 between current_date and current_date + 14
`;

export const QUESTIONS = [
  { question: 'What has each mechanism of injury cost this year, paid and estimated, by site?', sql: `
    select s.code as site, i.mechanism, count(distinct c.id)::int as claims, coalesce(sum(p.amount_cents), 0)::int as paid_cents,
      coalesce(sum(distinct c.estimate_cents), 0)::int as estimate_cents, max(case when s.jurisdiction = 'NZ' then 'NZD' else 'AUD' end) as currency
    from claims c join injuries i on i.id = c.injury_id join sites s on s.id = i.site_id left join payments p on p.claim_id = c.id
    where i.occurred_at >= date_trunc('year', current_date) group by s.code, i.mechanism order by estimate_cents desc, paid_cents desc limit 10` },
  { question: 'How many hours from becoming aware to telling the insurer, by site?', sql: `
    select s.code as site, count(*)::int as injuries, round(avg(extract(epoch from i.insurer_notified_at - i.aware_at) / 3600)::numeric, 1) as avg_hours,
      max(round((extract(epoch from i.insurer_notified_at - i.aware_at) / 3600)::numeric, 1)) as worst_hours,
      count(*) filter (where i.insurer_notified_at is null and i.severity in ('medical', 'lost-time'))::int as not_told
    from injuries i join sites s on s.id = i.site_id where s.arrangement = 'insured' group by s.code order by s.code` },
  { question: 'Which legal deadlines were missed or met late in the last 12 months, by site and rule?', sql: `
    select site, item, count(*) filter (where standing in ('overdue', 'deemed'))::int as missed, count(*) filter (where standing = 'done late')::int as late,
      count(*) filter (where standing = 'done')::int as on_time
    from v_deadlines where basis = 'law' and due_at >= now() - interval '12 months' group by site, item
    having count(*) filter (where standing in ('overdue', 'deemed', 'done late')) > 0 order by missed desc, late desc` },
  { question: 'How many days from the first certificate to full capacity, by nature of injury, on closed claims?', sql: `
    select i.nature, count(*)::int as claims, round(avg(fit.from_on - first.from_on))::int as avg_days, max(fit.from_on - first.from_on)::int as longest_days
    from claims c join injuries i on i.id = c.injury_id
    join lateral (select min(from_on) as from_on from certificates x where x.claim_id = c.id) first on true
    join lateral (select min(from_on) as from_on from certificates x where x.claim_id = c.id and x.capacity = 'full') fit on fit.from_on is not null
    group by i.nature order by avg_days desc` },
  { question: 'Which open claims have been on no capacity longest without a step back?', sql: `
    select c.ref, c.worker, c.site, c.nature, min(x.from_on) as off_since, (current_date - min(x.from_on))::int as days_no_capacity
    from v_claims c join certificates x on x.claim_id = c.id and x.capacity = 'none'
    where c.status = 'open' and c.capacity = 'none' and not exists (select 1 from certificates y where y.claim_id = c.id and y.capacity <> 'none')
    group by c.ref, c.worker, c.site, c.nature order by days_no_capacity desc` },
  { question: 'How much money is waiting to be reimbursed, by insurer, and how old is it?', sql: `
    select coalesce(insurer, 'not set') as insurer, currency, count(*)::int as payments, sum(amount_cents)::int as waiting_cents, max(days)::int as oldest_days
    from v_reimbursements where reimbursed_on is null group by insurer, currency order by waiting_cents desc` },
  { question: 'Which workers have been injured more than once in two years?', sql: `
    select w.code, w.name, s.code as site, count(*)::int as injuries, string_agg(i.nature || ' (' || i.occurred_at::date || ')', '; ' order by i.occurred_at) as history
    from injuries i join workers w on w.id = i.worker_id join sites s on s.id = w.site_id
    where i.occurred_at >= now() - interval '2 years' group by w.code, w.name, s.code having count(*) > 1 order by injuries desc` },
  { question: 'Which body parts get hurt most at each site, and how?', sql: `
    select s.code as site, coalesce(i.body_part, 'not recorded') as body_part, count(*)::int as injuries, count(*) filter (where i.severity = 'lost-time')::int as lost_time,
      string_agg(distinct i.mechanism, '; ') as mechanisms
    from injuries i join sites s on s.id = i.site_id group by s.code, i.body_part order by injuries desc, lost_time desc limit 10` },
  { question: 'Which open claims have gone quiet, and what is estimated on them?', sql: `
    select ref, worker, site, liability, coalesce(last_note_at::date, received_on) as last_touched, (current_date - coalesce(last_note_at::date, received_on))::int as days_quiet,
      estimate_cents, currency
    from v_claims where status = 'open' order by days_quiet desc` },
  { question: 'Which weekly claims step down from 95% to 80% in the next 30 days?', sql: `
    select ref, worker, site, jurisdiction, incapacity_from, (incapacity_from + 91) as week_14_starts, capacity, cert_hours as certified_hours
    from v_claims where status = 'open' and weekly and jurisdiction in ('NSW', 'VIC') and incapacity_from + 91 between current_date and current_date + 30
    order by week_14_starts` },
];

export const reads = {
  async sites(db) {
    return db.query(`select s.code, s.name, s.jurisdiction, s.arrangement, s.insurer, s.rtw_coordinator,
      (select count(*) from workers w where w.site_id = s.id and w.status = 'active')::int as workers,
      (select count(*) from v_claims c where c.site_id = s.id and c.status = 'open')::int as open_claims,
      (select count(*) from v_deadlines d where d.site = s.code and d.basis = 'law' and d.standing in ('overdue', 'deemed'))::int as overdue
      from sites s order by s.code`);
  },
  async site(db, [term]) {
    const s = await site(db, term);
    return {
      site: s,
      open_claims: await db.query('select ref, worker, liability, capacity, cert_standing, plan_status, week_no from v_claims where site_id = $1 and status = $2 order by ref', [s.id, 'open']),
      deadlines: await db.query(`select item, ref, worker, due_on, standing from v_deadlines where site = $1 and standing not in ('done') order by due_at`, [s.code]),
      injuries_90_days: await db.query(`select ref, occurred_at::date as day, worker, nature, severity from v_register where site_id = $1 and occurred_at >= now() - interval '90 days' order by occurred_at desc`, [s.id]),
    };
  },
  async workers(db, a, f) {
    const s = f.site ? await site(db, f.site) : null;
    return db.query(`select w.code, w.name, s.code as site, w.role, w.status, w.hours_per_week as hours, w.piawe_cents, case when s.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency,
      (select count(*) from injuries i where i.worker_id = w.id)::int as injuries
      from workers w join sites s on s.id = w.site_id where ($1::uuid is null or s.id = $1) order by w.code`, [s?.id ?? null]);
  },
  async worker(db, [term]) {
    const w = await worker(db, term);
    return {
      worker: w,
      injuries: await db.query(`select ref, occurred_at::date as day, nature, body_part, severity, claim_ref, liability from v_register where worker = $1 order by occurred_at desc`, [w.name]),
    };
  },
  async injuries(db, a, f) {
    const s = f.site ? await site(db, f.site) : null;
    const days = f.days ? num(f.days, 'days', { min: 1, max: 3650 }) : 365;
    return db.query(`select ref, site, occurred_at, worker, nature, body_part, severity, case when notifiable then 'yes' else '' end as notifiable, claim_ref, liability
      from v_register where ($1::uuid is null or site_id = $1) and occurred_at >= now() - make_interval(days => $2::int) order by occurred_at desc`, [s?.id ?? null, days]);
  },
  async injury(db, [term]) {
    const i = await injury(db, term);
    return {
      injury: i,
      claim: (await db.query('select ref, claim_number, liability, status, capacity, cert_to from v_claims where injury_id = $1', [i.id]))[0] || null,
      deadlines: await db.query('select item, due_at, done_at, standing, rule from v_deadlines where injury_id = $1 order by due_at', [i.id]),
      actions: await db.query('select ref, what, due_on, done_on, outcome from actions where injury_id = $1 order by due_on', [i.id]),
    };
  },
  async claims(db, a, f) {
    const s = f.site ? await site(db, f.site) : null;
    return db.query(`select ref, worker, site, nature, liability, status, capacity, cert_to, cert_standing, plan_status, week_no, paid_cents, estimate_cents, currency
      from v_claims where ($1::uuid is null or site_id = $1) and ($2::boolean is false or status = 'open') order by status desc, ref`, [s?.id ?? null, !!f.open]);
  },
  async claim(db, [term]) {
    const c = await claim(db, term);
    return {
      claim: c,
      deadlines: await db.query('select item, due_on, standing, rule from v_deadlines where claim_id = $1 or (claim_id is null and injury_id = $2) order by due_at', [c.id, c.injury_id]),
      certificates: await db.query('select ref, issued_on, from_on, to_on, capacity, hours_per_week, restrictions, doctor from certificates where claim_id = $1 order by from_on', [c.id]),
      plans: await db.query('select ref, starts_on, review_on, duties, hours_per_week, status, agreed_on from rtw_plans where claim_id = $1 order by starts_on', [c.id]),
      payments: await db.query('select ref, kind, period_from, period_to, paid_on, payee, amount_cents, $2::text as currency, reimbursable, reimbursed_on from payments where claim_id = $1 order by paid_on', [c.id, c.currency]),
      actions: await db.query('select ref, what, due_on, done_on, outcome from actions where claim_id = $1 order by due_on', [c.id]),
      notes: await db.query(`select to_char(at, 'YYYY-MM-DD') as day, kind, who, body from notes where claim_id = $1 order by at desc limit 10`, [c.id]),
    };
  },
  async deadlines(db, a, f) {
    const s = f.site ? await site(db, f.site) : null;
    return db.query(`select item, basis, ref, worker, site, to_char(due_at, 'YYYY-MM-DD HH24:MI') as due, standing, rule from v_deadlines
      where ($1::text is null or site = $1) and ($2::boolean or standing not in ('done', 'done late'))
      order by case standing when 'deemed' then 0 when 'overdue' then 0 when 'due soon' then 1 when 'open' then 2 else 3 end, due_at`, [s?.code ?? null, !!f.all]);
  },
  async attention(db) {
    return db.query(`select item, ref, detail from (${ATTENTION}) x order by rank, item, ref`);
  },
  async compliance(db) {
    const rules = await db.query(`select item as rule, basis, count(*) filter (where standing in ('overdue', 'deemed'))::int as breached,
      count(*) filter (where standing = 'due soon')::int as due_soon, count(*) filter (where standing = 'done late')::int as met_late,
      count(*) filter (where standing in ('done', 'open'))::int as clean, min(rule) as source
      from v_deadlines group by item, basis order by (basis = 'law') desc, breached desc, item`);
    const breaches = await db.query(`select item as rule, ref, worker, site, due_on, standing from v_deadlines where standing in ('overdue', 'deemed', 'due soon')
      order by (basis = 'law') desc, due_at`);
    return { rules, breaches };
  },
  async register(db, a, f) {
    const s = f.site ? await site(db, f.site) : null;
    return db.query(`select ref, site, to_char(occurred_at, 'YYYY-MM-DD HH24:MI') as occurred, worker, role, location, mechanism, nature, body_part, reported_by,
      registered_on, case when notifiable then coalesce(regulator_ref, 'NOT NOTIFIED') else '' end as regulator
      from v_register where ($1::uuid is null or site_id = $1) order by occurred_at`, [s?.id ?? null]);
  },
  async certificates(db) {
    return db.query(`select cert_ref as ref, ref as claim, worker, site, capacity, cert_hours as hours, cert_to as to_on, cert_standing as standing, restrictions
      from v_claims where status = 'open' and cert_ref is not null order by cert_to`);
  },
  async plans(db) {
    return db.query(`select p.ref, c.ref as claim, c.worker, c.site, p.starts_on, p.review_on, p.hours_per_week as hours, p.status,
      case when p.status = 'agreed' and p.review_on < current_date then 'review missed' when p.status = 'draft' then 'not agreed' else '' end as flag
      from rtw_plans p join v_claims c on c.id = p.claim_id where p.status <> 'ended' order by p.review_on`);
  },
  async payments(db, a, f) {
    const c = f.claim ? await claim(db, f.claim) : null;
    return db.query(`select p.ref, c.ref as claim, c.worker, p.kind, p.period_from, p.period_to, p.paid_on, p.payee, p.amount_cents, c.currency, p.reimbursable, p.reimbursed_on
      from payments p join v_claims c on c.id = p.claim_id where ($1::uuid is null or c.id = $1) order by p.paid_on desc, p.ref`, [c?.id ?? null]);
  },
  async reimbursements(db, a, f) {
    return db.query(`select ref, claim_ref, worker, site, insurer, kind, paid_on, amount_cents, currency, reimbursed_on, days, standing
      from v_reimbursements where ($1::boolean is false or reimbursed_on is null) order by reimbursed_on nulls first, paid_on`, [!!f.open]);
  },
  // The statutory weekly amount for a claim this week (or --week=N), before the scheme's indexed maximum.
  async weekly(db, [term], f) {
    const c = await claim(db, term);
    if (!c.weekly) throw Error(`${c.ref} is not a claim for weekly compensation`);
    const week = f.week ? num(f.week, 'week', { min: 1, max: 520 }) : c.week_no;
    const earnings = f.earnings ? cents(f.earnings, 'earnings') : 0;
    const hours = f.hours !== undefined ? num(f.hours, 'hours', { min: 0, max: 100 }) : (c.capacity === 'suitable' && earnings ? Number(c.cert_hours || 0) : 0);
    const [r] = await db.query('select weekly_rate_pct($1, $2, $3) as pct, weekly_amount_cents($1, $2, $4, $5, $3) as amount', [c.jurisdiction, week, hours, c.piawe_cents, earnings]);
    const rule = {
      NSW: 'Workers Compensation Act 1987 (NSW) s 36 (weeks 1 to 13: 95% of PIAWE less earnings) and s 37 (weeks 14 to 130: 95% when working 15 hours or more a week, otherwise 80%, less earnings)',
      VIC: 'WIRC Act 2013 (Vic): first entitlement period, weeks 1 to 13, 95% of PIAWE less earnings; second, weeks 14 to 130, 80% of PIAWE less earnings',
      NZ: 'Accident Compensation Act 2001: 80% of weekly earnings (s 98 first week by the employer). ACC abates for earnings after the injury: record the amount it sets',
    }[c.jurisdiction] || `No rate is built in for ${c.jurisdiction}. Set the scheme's own rate and record the payment the insurer confirms.`;
    return {
      claim: c.ref, worker: c.worker, jurisdiction: c.jurisdiction, week, piawe_cents: c.piawe_cents, earnings_cents: earnings, hours_worked: hours,
      rate_pct: r.pct == null ? null : Number(r.pct), amount_cents: r.amount, currency: c.currency,
      step_down: ['NSW', 'VIC'].includes(c.jurisdiction) ? `week 14 starts ${addDays(c.incapacity_from, 91)}` : null,
      rule,
      check: c.piawe_cents == null ? 'No pre-injury earnings recorded: set it with add-worker --piawe or the insurer\'s figure first.'
        : 'Before the indexed maximum: set max_weekly_cents_<state> with /set to cap it. The insurer\'s calculation is the one that pays.',
    };
  },
  async costs(db, a, f) {
    const from = f.from ? date(f.from, 'from') : `${today().slice(0, 4)}-01-01`;
    return db.query(`select c.site, c.currency, count(*)::int as claims, count(*) filter (where c.status = 'open')::int as open,
      sum(c.paid_cents)::int as paid_cents, sum(c.awaiting_reimbursement_cents)::int as awaiting_cents, sum(coalesce(c.estimate_cents, 0))::int as estimate_cents
      from v_claims c where c.received_on >= $1 group by c.site, c.currency order by c.site`, [from]);
  },
  async actions(db, a, f) {
    return db.query(`select a.ref, coalesce(c.ref, i.ref) as about, a.what, a.due_on, a.done_on,
      case when a.done_on is not null then 'done' when a.due_on < current_date then 'overdue' else 'open' end as standing
      from actions a left join claims c on c.id = a.claim_id left join injuries i on i.id = a.injury_id
      where ($1::boolean is false or a.done_on is null) order by a.done_on nulls first, a.due_on`, [!!f.open]);
  },
  async insights(db) {
    const out = [];
    for (const q of QUESTIONS) out.push({ question: q.question, rows: await db.query(q.sql) });
    return out;
  },
  async activity(db, a, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 3650 }) : 7;
    return db.query(`select to_char(at, 'YYYY-MM-DD HH24:MI') as at, actor, action, ref, detail from activity where at >= now() - make_interval(days => $1::int) order by at desc`, [days]);
  },
  async settings(db) {
    return db.query('select key, value, note from settings order by key');
  },
};

function addDays(d, n) {
  const x = new Date(`${String(d instanceof Date ? d.toISOString().slice(0, 10) : d).slice(0, 10)}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ writes

export const writes = {
  async 'add-site'(db, a, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'jurisdiction', 'arrangement');
    const code = String(f.code).toUpperCase();
    const j = oneOf(String(f.jurisdiction).toUpperCase(), JURISDICTIONS, 'jurisdiction');
    const arr = oneOf(String(f.arrangement), ARRANGEMENTS, 'arrangement');
    if (arr === 'accredited' && j !== 'NZ') throw Error('Accredited means an ACC Accredited Employer: New Zealand only. Use self-insured for an Australian licence.');
    return tx(db, async () => {
      const [s] = await db.query(`insert into sites (code, name, jurisdiction, arrangement, insurer, policy_number, address, rtw_coordinator) values ($1,$2,$3,$4,$5,$6,$7,$8) returning code, name, jurisdiction, arrangement`,
        [code, String(f.name), j, arr, text(f.insurer), text(f.policy), text(f.address), text(f.coordinator)]);
      await log(db, actor, 'add-site', code, `${f.name}, ${j}, ${arr}`);
      return s;
    });
  },
  async 'add-worker'(db, a, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'site');
    const s = await site(db, f.site);
    return tx(db, async () => {
      const [w] = await db.query(`insert into workers (code, site_id, name, dob, role, email, phone, started_on, hours_per_week, piawe_cents) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        returning code, name, role`, [String(f.code).toUpperCase(), s.id, String(f.name), f.dob ? date(f.dob, 'dob') : null, text(f.role), text(f.email), text(f.phone),
        f.started ? date(f.started, 'started') : null, f.hours ? num(f.hours, 'hours', { max: 100 }) : null, f.piawe ? cents(f.piawe, 'piawe') : null]);
      await log(db, actor, 'add-worker', w.code, `${w.name} at ${s.code}`);
      return { ...w, site: s.code };
    });
  },
  async 'worker-status'(db, [term], f) {
    const actor = actorOf(f);
    const w = await worker(db, term);
    const status = oneOf(String(f.status ?? ''), ['active', 'left'], 'status');
    const piawe = f.piawe ? cents(f.piawe, 'piawe') : null;
    return tx(db, async () => {
      await db.query('update workers set status = $2, left_on = $3, piawe_cents = coalesce($4, piawe_cents), hours_per_week = coalesce($5, hours_per_week) where id = $1',
        [w.id, status, status === 'left' ? pastDate(f.date, 'date') : null, piawe, f.hours ? num(f.hours, 'hours', { max: 100 }) : null]);
      await log(db, actor, 'worker-status', w.code, `${status}${piawe ? `, PIAWE ${money(piawe, cur(w.jurisdiction))}` : ''}`);
      return { worker: w.code, name: w.name, status };
    });
  },
  // A new injury: it goes in the register and starts every clock the law sets.
  async 'report-injury'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'occurred', 'mechanism', 'nature', 'severity');
    const w = await worker(db, term);
    const occurred = pastStamp(f.occurred, 'occurred');
    const aware = f.aware ? pastStamp(f.aware, 'aware') : occurred;
    if (aware < occurred) throw Error('--aware cannot be before --occurred');
    const severity = oneOf(String(f.severity), SEVERITIES, 'severity');
    const s = await site(db, f.site || w.site);
    return tx(db, async () => {
      const ref = await nextRef(db, 'injuries', 'INJ-', 4);
      await db.query(`insert into injuries (ref, worker_id, site_id, occurred_at, aware_at, reported_by, location, mechanism, nature, body_part, description, mental, severity, notifiable, registered_on)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [ref, w.id, s.id, occurred, aware, text(f['reported-by']) || w.name, text(f.location), String(f.mechanism), String(f.nature), text(f['body-part']), text(f.description),
          flag(f.mental), severity, flag(f.notifiable), f.registered ? pastDate(f.registered, 'registered') : null]);
      await log(db, actor, 'report-injury', ref, `${w.name}: ${f.nature}, ${severity}`);
      const deadlines = await db.query(`select item, to_char(due_at, 'YYYY-MM-DD HH24:MI') as due, standing, rule from v_deadlines where ref = $1 order by due_at`, [ref]);
      return { injury: ref, worker: w.name, site: s.code, severity, deadlines, next: deadlines.length ? 'Each deadline above is now on /attention until it is recorded as done.' : 'No statutory clock for this one. It is in the register.' };
    });
  },
  async registered(db, [term], f) {
    const actor = actorOf(f);
    const i = await injury(db, term);
    const d = pastDate(f.date, 'date');
    return tx(db, async () => {
      await db.query('update injuries set registered_on = $2 where id = $1', [i.id, d]);
      await log(db, actor, 'registered', i.ref, `entered in the register of injuries ${d}`);
      return { injury: i.ref, registered_on: d };
    });
  },
  async 'notify-insurer'(db, [term], f) {
    const actor = actorOf(f);
    const i = await injury(db, term);
    if (i.arrangement !== 'insured') throw Error(`${i.site} is ${i.arrangement}: the claim stays with you, there is no insurer to tell`);
    const at = pastStamp(f.at, 'at');
    return tx(db, async () => {
      await db.query('update injuries set insurer_notified_at = $2 where id = $1', [i.id, at]);
      await log(db, actor, 'notify-insurer', i.ref, `${i.insurer || 'insurer'} told ${at.slice(0, 16)}`);
      const [d] = await db.query(`select standing from v_deadlines where injury_id = $1 and item = 'insurer notice'`, [i.id]);
      return { injury: i.ref, insurer: i.insurer, told_at: at.slice(0, 16), standing: d?.standing || 'no statutory clock' };
    });
  },
  async 'notify-regulator'(db, [term], f) {
    const actor = actorOf(f);
    const i = await injury(db, term);
    if (!i.notifiable) throw Error(`${i.ref} is not marked notifiable. If it is, record it with --notifiable on the injury first (/set-notifiable).`);
    need(f, 'reference');
    const at = pastStamp(f.at, 'at');
    return tx(db, async () => {
      await db.query('update injuries set regulator_notified_at = $2, regulator_ref = $3 where id = $1', [i.id, at, String(f.reference)]);
      await log(db, actor, 'notify-regulator', i.ref, `${f.reference} at ${at.slice(0, 16)}`);
      const [r] = await db.query('select regulator_of($1) as regulator', [i.jurisdiction]);
      return { injury: i.ref, regulator: r.regulator, reference: f.reference, notified_at: at.slice(0, 16), keep: 'Keep the record of the notifiable incident for at least 5 years (WHS Act s 38(7), HSWA s 57).' };
    });
  },
  async 'set-notifiable'(db, [term], f) {
    const actor = actorOf(f);
    const i = await injury(db, term);
    return tx(db, async () => {
      await db.query('update injuries set notifiable = true where id = $1', [i.id]);
      await log(db, actor, 'set-notifiable', i.ref, 'marked notifiable');
      const [r] = await db.query('select regulator_of($1) as regulator', [i.jurisdiction]);
      return { injury: i.ref, notifiable: true, tell: r.regulator, next: 'Notify the regulator now, then record it with /notify-regulator.' };
    });
  },
  // A claim form (or ACC45) received. Starts the claim clocks.
  async 'lodge-claim'(db, [term], f) {
    const actor = actorOf(f);
    const i = await injury(db, term);
    const received = pastDate(f.received, 'received');
    if (received < String(i.occurred_at instanceof Date ? i.occurred_at.toISOString() : i.occurred_at).slice(0, 10)) throw Error('--received cannot be before the injury');
    const weekly = flag(f.weekly);
    if (weekly) need(f, 'incapacity-from');
    return tx(db, async () => {
      if ((await db.query('select 1 from claims where injury_id = $1', [i.id])).length) throw Error(`${i.ref} already has a claim`);
      const ref = `CLM-${i.ref.replace(/^INJ-/, '')}`;
      await db.query(`insert into claims (ref, injury_id, claim_number, received_on, weekly, incapacity_from, estimate_cents, case_manager, treating_doctor) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [ref, i.id, text(f.number), received, weekly, weekly ? date(f['incapacity-from'], 'incapacity-from') : null, f.estimate ? cents(f.estimate, 'estimate') : null, text(f['case-manager']), text(f.doctor)]);
      await log(db, actor, 'lodge-claim', ref, `${i.worker}: claim received ${received}${weekly ? ', weekly compensation' : ''}`);
      const deadlines = await db.query(`select item, due_on, standing, rule from v_deadlines where ref = $1 order by due_at`, [ref]);
      return { claim: ref, injury: i.ref, worker: i.worker, received_on: received, weekly, deadlines };
    });
  },
  async 'forward-claim'(db, [term], f) {
    const actor = actorOf(f);
    const c = await claim(db, term);
    if (c.arrangement !== 'insured') throw Error(`${c.site} is ${c.arrangement}: nothing to forward`);
    const d = pastDate(f.date, 'date');
    return tx(db, async () => {
      await db.query('update claims set forwarded_on = $2, claim_number = coalesce($3, claim_number) where id = $1', [c.id, d, text(f.number)]);
      await log(db, actor, 'forward-claim', c.ref, `sent to ${c.insurer || 'the insurer'} ${d}`);
      return { claim: c.ref, forwarded_on: d, insurer: c.insurer };
    });
  },
  async 'notify-authority'(db, [term], f) {
    const actor = actorOf(f);
    const c = await claim(db, term);
    if (!(c.jurisdiction === 'VIC' && c.mental)) throw Error('Only a Victorian mental injury claim needs WorkSafe notified separately');
    const d = pastDate(f.date, 'date');
    return tx(db, async () => {
      await db.query('update claims set authority_notified_on = $2 where id = $1', [c.id, d]);
      await log(db, actor, 'notify-authority', c.ref, `WorkSafe Victoria told of the mental injury claim ${d}`);
      return { claim: c.ref, authority_notified_on: d };
    });
  },
  // The liability or cover decision, as the insurer, agent or accredited employer made it.
  async liability(db, [term], f) {
    const actor = actorOf(f);
    const c = await claim(db, term);
    const decision = oneOf(String(f.decision ?? ''), DECISIONS, 'decision');
    const d = pastDate(f.date, 'date');
    if (decision === 'declined' && !text(f.reason)) throw Error('--reason is required for a declined claim: the written decision must give it');
    return tx(db, async () => {
      const [late] = await db.query(`select standing from v_deadlines where claim_id = $1 and item = 'cover decision'`, [c.id]);
      if (late?.standing === 'deemed' && decision === 'declined') throw Error(`Cover for ${c.ref} is already deemed: the 21 days ran out (Accident Compensation Act 2001 s 58). It cannot be declined now. Record --decision=accepted.`);
      await db.query('update claims set liability = $2, liability_on = $3 where id = $1', [c.id, decision, d]);
      if (text(f.reason)) await db.query(`insert into notes (claim_id, kind, body, actor) values ($1, 'note', $2, $3)`, [c.id, `Decision ${decision}: ${f.reason}`, actor]);
      await log(db, actor, 'liability', c.ref, `${decision} ${d}`);
      return { claim: c.ref, liability: decision, decided_on: d, next: c.arrangement === 'accredited' ? 'Draft the written decision with /draft-cover-decision.' : null };
    });
  },
  async certificate(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'from', 'to', 'capacity');
    const c = await claim(db, term);
    const capacity = oneOf(String(f.capacity), CAPACITIES, 'capacity');
    const from = date(f.from, 'from'); const to = date(f.to, 'to');
    if (to < from) throw Error('--to cannot be before --from');
    if (capacity === 'suitable' && !text(f.restrictions)) throw Error('--restrictions is required for suitable capacity: copy them from the certificate');
    return tx(db, async () => {
      const ref = await nextRef(db, 'certificates', 'CC-', 4);
      await db.query(`insert into certificates (ref, claim_id, issued_on, from_on, to_on, capacity, hours_per_week, restrictions, doctor) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [ref, c.id, f.issued ? pastDate(f.issued, 'issued') : today(), from, to, capacity, f.hours ? num(f.hours, 'hours', { max: 100 }) : null, text(f.restrictions), text(f.doctor) || c.treating_doctor]);
      await log(db, actor, 'certificate', ref, `${c.ref}: ${capacity} ${from} to ${to}`);
      const next = capacity === 'suitable' && c.plan_status !== 'agreed' ? 'Suitable capacity: agree a return to work plan (/add-plan, /agree-plan).'
        : capacity === 'full' ? 'Full capacity: end any plan and close the claim when treatment is done (/end-plan, /close-claim).' : null;
      return { certificate: ref, claim: c.ref, capacity, from_on: from, to_on: to, next };
    });
  },
  async 'add-plan'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'starts', 'review', 'duties');
    const c = await claim(db, term);
    const starts = date(f.starts, 'starts'); const review = date(f.review, 'review');
    if (review < starts) throw Error('--review cannot be before --starts');
    if (c.capacity === 'none') throw Error(`${c.worker}'s current certificate says no capacity: a plan needs a suitable-capacity certificate first`);
    const hours = f.hours ? num(f.hours, 'hours', { max: 100 }) : null;
    if (hours && c.cert_hours && hours > Number(c.cert_hours)) throw Error(`--hours ${hours} is more than the certificate allows (${c.cert_hours} a week)`);
    return tx(db, async () => {
      const ref = await nextRef(db, 'rtw_plans', 'RTW-', 3);
      await db.query('insert into rtw_plans (ref, claim_id, starts_on, review_on, duties, hours_per_week) values ($1,$2,$3,$4,$5,$6)', [ref, c.id, starts, review, String(f.duties), hours]);
      await log(db, actor, 'add-plan', ref, `${c.ref}: ${f.duties}`);
      return { plan: ref, claim: c.ref, status: 'draft', restrictions: c.restrictions, next: 'Agree it with the worker (and the doctor where needed), then /agree-plan.' };
    });
  },
  async 'agree-plan'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'by');
    const p = await plan(db, term);
    if (p.status !== 'draft') throw Error(`${p.ref} is already ${p.status}`);
    const d = pastDate(f.date, 'date');
    return tx(db, async () => {
      await db.query(`update rtw_plans set status = 'agreed', agreed_on = $2, agreed_by = $3 where id = $1`, [p.id, d, String(f.by)]);
      await db.query(`update rtw_plans set status = 'ended', ended_on = $3 where claim_id = $1 and id <> $2 and status = 'agreed'`, [p.claim_id, p.id, d]);
      await log(db, actor, 'agree-plan', p.ref, `agreed ${d} by ${f.by}`);
      return { plan: p.ref, claim: p.claim_ref, agreed_on: d, review_on: p.review_on };
    });
  },
  async 'end-plan'(db, [term], f) {
    const actor = actorOf(f);
    const p = await plan(db, term);
    if (p.status === 'ended') throw Error(`${p.ref} has already ended`);
    const d = pastDate(f.date, 'date');
    return tx(db, async () => {
      await db.query(`update rtw_plans set status = 'ended', ended_on = $2, agreed_on = coalesce(agreed_on, $2) where id = $1`, [p.id, d]);
      await log(db, actor, 'end-plan', p.ref, `ended ${d}`);
      return { plan: p.ref, ended_on: d };
    });
  },
  async pay(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'kind', 'payee', 'amount');
    const c = await claim(db, term);
    const kind = oneOf(String(f.kind), PAY_KINDS, 'kind');
    if (kind === 'first-week' && c.jurisdiction !== 'NZ') throw Error('First week compensation is the New Zealand employer\'s payment. Use --kind=weekly.');
    if (c.liability === 'declined' && ['weekly', 'first-week'].includes(kind)) throw Error(`${c.ref} is declined: no weekly compensation is payable on it`);
    const pf = f.from ? date(f.from, 'from') : null; const pt = f.to ? date(f.to, 'to') : pf;
    if (pt && !pf) throw Error('--to needs --from');
    return tx(db, async () => {
      if (f.invoice && (await db.query('select 1 from payments where claim_id = $1 and invoice_ref = $2', [c.id, String(f.invoice)])).length) throw Error(`Invoice ${f.invoice} is already paid on ${c.ref}`);
      if (pf && ['weekly', 'first-week'].includes(kind)) {
        const overlap = await db.query(`select ref from payments where claim_id = $1 and kind in ('weekly', 'first-week') and period_from <= $3 and period_to >= $2`, [c.id, pf, pt]);
        if (overlap.length) throw Error(`That period overlaps ${overlap.map((x) => x.ref).join(', ')}: weekly compensation is paid once for each day`);
      }
      const ref = await nextRef(db, 'payments', 'PAY-', 4);
      const amount = cents(f.amount, 'amount');
      await db.query(`insert into payments (ref, claim_id, kind, period_from, period_to, paid_on, payee, amount_cents, reimbursable, invoice_ref, note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [ref, c.id, kind, pf, pt, pastDate(f.paid, 'paid'), String(f.payee), amount, flag(f.reimbursable), text(f.invoice), text(f.note)]);
      await log(db, actor, 'pay', ref, `${c.ref}: ${kind} ${money(amount, c.currency)} to ${f.payee}`);
      return { payment: ref, claim: c.ref, kind, amount: money(amount, c.currency), reimbursable: flag(f.reimbursable) };
    });
  },
  async reimbursed(db, [term], f) {
    const actor = actorOf(f);
    const p = await payment(db, term);
    if (!p.reimbursable) throw Error(`${p.ref} is not marked as reimbursable`);
    if (p.reimbursed_on) throw Error(`${p.ref} was already reimbursed on ${String(p.reimbursed_on).slice(0, 10)}`);
    const d = pastDate(f.date, 'date');
    return tx(db, async () => {
      await db.query('update payments set reimbursed_on = $2 where id = $1', [p.id, d]);
      await log(db, actor, 'reimbursed', p.ref, `reimbursed ${d}`);
      return { payment: p.ref, reimbursed_on: d };
    });
  },
  async estimate(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'amount');
    const c = await claim(db, term);
    const amount = cents(f.amount, 'amount');
    return tx(db, async () => {
      await db.query('update claims set estimate_cents = $2 where id = $1', [c.id, amount]);
      await log(db, actor, 'estimate', c.ref, `estimate ${money(c.estimate_cents || 0, c.currency)} -> ${money(amount, c.currency)}`);
      return { claim: c.ref, estimate: money(amount, c.currency) };
    });
  },
  async 'close-claim'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const c = await claim(db, term);
    if (c.status === 'closed') throw Error(`${c.ref} is already closed`);
    const d = pastDate(f.date, 'date');
    const open = await db.query(`select item from v_deadlines where claim_id = $1 and basis = 'law' and standing in ('overdue', 'due soon', 'open', 'deemed')`, [c.id]);
    if (open.length && !flag(f.force)) throw Error(`${c.ref} still has a legal deadline open (${open.map((x) => x.item).join(', ')}). Record it first, or pass --force with a reason that explains why.`);
    return tx(db, async () => {
      await db.query(`update claims set status = 'closed', closed_on = $2, closed_reason = $3 where id = $1`, [c.id, d, String(f.reason)]);
      await db.query(`update rtw_plans set status = 'ended', ended_on = $2, agreed_on = coalesce(agreed_on, $2) where claim_id = $1 and status <> 'ended'`, [c.id, d]);
      await log(db, actor, 'close-claim', c.ref, String(f.reason));
      return { claim: c.ref, closed_on: d, reason: f.reason };
    });
  },
  async 'reopen-claim'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const c = await claim(db, term);
    if (c.status !== 'closed') throw Error(`${c.ref} is open`);
    return tx(db, async () => {
      await db.query(`update claims set status = 'open', closed_on = null, closed_reason = null where id = $1`, [c.id]);
      await db.query(`insert into notes (claim_id, kind, body, actor) values ($1, 'note', $2, $3)`, [c.id, `Reopened: ${f.reason}`, actor]);
      await log(db, actor, 'reopen-claim', c.ref, String(f.reason));
      return { claim: c.ref, status: 'open' };
    });
  },
  async 'add-action'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'what', 'due');
    let c = null; let i = null;
    if (/^INJ-/i.test(String(term))) i = await injury(db, term); else c = await claim(db, term);
    return tx(db, async () => {
      const ref = await nextRef(db, 'actions', 'ACT-', 3);
      await db.query('insert into actions (ref, claim_id, injury_id, what, due_on) values ($1,$2,$3,$4,$5)', [ref, c?.id ?? null, i?.id ?? null, String(f.what), date(f.due, 'due')]);
      await log(db, actor, 'add-action', ref, `${c?.ref || i?.ref}: ${f.what}`);
      return { action: ref, about: c?.ref || i?.ref, what: f.what, due_on: f.due };
    });
  },
  async 'close-action'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'outcome');
    const x = await action(db, term);
    if (x.done_on) throw Error(`${x.ref} is already closed`);
    const d = pastDate(f.date, 'date');
    return tx(db, async () => {
      await db.query('update actions set done_on = $2, outcome = $3 where id = $1', [x.id, d, String(f.outcome)]);
      await log(db, actor, 'close-action', x.ref, String(f.outcome));
      return { action: x.ref, done_on: d, outcome: f.outcome };
    });
  },
  async note(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'text');
    const c = await claim(db, term);
    const kind = oneOf(String(f.kind || 'note'), NOTE_KINDS, 'kind');
    return tx(db, async () => {
      await db.query('insert into notes (claim_id, at, kind, who, body, actor) values ($1, coalesce($2::timestamptz, now()), $3, $4, $5, $6)',
        [c.id, f.at ? pastStamp(f.at, 'at') : null, kind, text(f.who), String(f.text), actor]);
      await log(db, actor, 'note', c.ref, `${kind}${f.who ? ` with ${f.who}` : ''}`);
      return { claim: c.ref, kind, noted: String(f.text) };
    });
  },
  async set(db, [key, value], f) {
    const actor = actorOf(f);
    if (!key || value === undefined) throw Error('Usage: set <key> <value>');
    if (!/^[a-z0-9_]+$/.test(key)) throw Error('Setting keys are lowercase words joined by _');
    num(value, key, { min: 0 });
    return tx(db, async () => {
      await db.query(`insert into settings (key, value, note) values ($1, $2, $3) on conflict (key) do update set value = excluded.value, note = coalesce(excluded.note, settings.note)`, [key, String(value), text(f.note)]);
      await log(db, actor, 'set', key, String(value));
      return { key, value: String(value) };
    });
  },
};

// ------------------------------------------------------------------ drafts (written to drafts/, never sent)

const fmtDate = (d) => (d ? new Date(`${String(d instanceof Date ? d.toISOString() : d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

export const drafts = {
  async 'weekly-review'(db, a, f) {
    const att = await reads.attention(db);
    const claims = await db.query(`select ref, worker, site, liability, capacity, cert_to, plan_status, week_no from v_claims where status = 'open' order by site, ref`);
    const money_ = await reads.costs(db, [], {});
    const lines = [`# Weekly injury and claims review, ${fmtDate(today())}`, '',
      `## Needs a person (${att.length})`, '', ...(att.length ? att.map((r) => `- **${r.item}** ${r.ref}: ${r.detail}`) : ['- Nothing.']), '',
      `## Open claims (${claims.length})`, '', '| Claim | Worker | Site | Liability | Capacity | Certificate to | Plan | Week |', '|---|---|---|---|---|---|---|---|',
      ...claims.map((c) => `| ${c.ref} | ${c.worker} | ${c.site} | ${c.liability} | ${c.capacity || ''} | ${c.cert_to ? String(c.cert_to instanceof Date ? c.cert_to.toISOString() : c.cert_to).slice(0, 10) : ''} | ${c.plan_status || ''} | ${c.week_no ?? ''} |`), '',
      '## Money this year', '', '| Site | Claims | Open | Paid | Waiting on reimbursement | Estimate |', '|---|---|---|---|---|---|',
      ...money_.map((m) => `| ${m.site} | ${m.claims} | ${m.open} | ${money(m.paid_cents, m.currency)} | ${money(m.awaiting_cents, m.currency)} | ${money(m.estimate_cents, m.currency)} |`), '',
      'Drafted from the claims records. Check each line before acting on it.'];
    return { file: draftFile(`weekly-review-${today()}.md`, lines.join('\n') + '\n'), items: att.length, open_claims: claims.length };
  },
  async 'draft-insurer-notice'(db, [term], f) {
    const i = await injury(db, term);
    if (i.arrangement !== 'insured') throw Error(`${i.site} is ${i.arrangement}: there is no insurer to notify`);
    const [d] = await db.query(`select to_char(due_at, 'YYYY-MM-DD HH24:MI') as due, rule from v_deadlines where injury_id = $1 and item = 'insurer notice'`, [i.id]);
    const [w] = await db.query('select * from workers where id = $1', [i.worker_id]);
    const [s] = await db.query('select * from sites where id = $1', [i.site_id]);
    const body = [`To: ${s.insurer || '[insurer]'}`, `Subject: Injury notification: ${w.name}, ${s.name}, policy ${s.policy_number || '[policy number]'}`, '',
      'Hello,', '', `We are notifying a workplace injury at ${s.name}.`, '',
      `- Worker: ${w.name}${w.dob ? `, born ${fmtDate(w.dob)}` : ''}, ${w.role || 'role not recorded'}`,
      `- Injury: ${i.nature}${i.body_part ? `, ${i.body_part}` : ''}`, `- How it happened: ${i.mechanism}`,
      `- When: ${String(i.occurred_at instanceof Date ? i.occurred_at.toISOString() : i.occurred_at).slice(0, 16).replace('T', ' ')}${i.location ? `, ${i.location}` : ''}`,
      `- We became aware: ${String(i.aware_at instanceof Date ? i.aware_at.toISOString() : i.aware_at).slice(0, 16).replace('T', ' ')}`,
      `- Time off work: ${i.severity === 'lost-time' ? 'yes' : 'no'}`, i.description ? `- What the worker told us: ${i.description}` : null, '',
      `Our return to work coordinator is ${s.rtw_coordinator || '[name]'}.`, '', 'Regards,', '[your name]', '',
      `<!-- Not sent. ${d ? `Due ${d.due}. ${d.rule}.` : ''} After sending, record it: /notify-insurer ${i.ref} --at="<when>" -->`].filter((x) => x !== null);
    return { file: draftFile(`insurer-notice-${i.ref}.md`, body.join('\n') + '\n'), due: d?.due || null };
  },
  async 'draft-doctor-letter'(db, [term], f) {
    const c = await claim(db, term);
    const duties = text(f.duties) || '[the suitable duties on offer, in plain words]';
    const siteName = (await db.query('select name from sites where id = $1', [c.site_id]))[0].name;
    const body = [`To: ${c.treating_doctor || '[treating doctor]'}`, `Subject: Suitable duties for ${c.worker} (claim ${c.claim_number || c.ref})`, '',
      `Dear ${c.treating_doctor || 'Doctor'},`, '',
      `${c.worker} is recovering from ${/^[aeiou]/i.test(c.nature) ? 'an' : 'a'} ${c.nature.toLowerCase()}${c.body_part ? ` (${c.body_part.toLowerCase()})` : ''} after an injury at work on ${fmtDate(c.injured_on)}. ${c.cert_to ? `The current certificate runs to ${fmtDate(c.cert_to)} with ${c.capacity === 'none' ? 'no capacity for work' : `${c.capacity} capacity`}${c.restrictions ? `: ${c.restrictions.replace(/\.\s*$/, '')}` : ''}.` : ''}`, '',
      `We can offer these duties at ${siteName}: ${duties.replace(/\.\s*$/, '')}. Hours can start low and build up at whatever pace you advise.`, '',
      'Could you consider these duties at the next review, and note on the certificate the hours and restrictions you are comfortable with?', '',
      `Our return to work coordinator is ${c.rtw_coordinator || '[name]'}, who is happy to talk them through.`, '', 'Kind regards,', '[your name]', '',
      '<!-- Not sent. The worker has seen this letter? Confirm before sending. -->'];
    return { file: draftFile(`doctor-letter-${c.ref}.md`, body.join('\n') + '\n'), doctor: c.treating_doctor };
  },
  async 'draft-rtw-plan'(db, [term]) {
    const p = await plan(db, term);
    const c = await claim(db, p.claim_ref);
    const body = [`# Return to work plan ${p.ref}`, '', `**Worker:** ${c.worker}  `, `**Site:** ${c.site}  `, `**Claim:** ${c.claim_number || c.ref}  `,
      `**Injury:** ${c.nature}${c.body_part ? `, ${c.body_part}` : ''}, ${fmtDate(c.injured_on)}`, '',
      '## The certificate this plan follows', '', `${c.capacity || 'no'} capacity to ${fmtDate(c.cert_to)}. Restrictions: ${c.restrictions || 'none recorded'}.`, '',
      '## Duties and hours', '', p.duties, '', `Hours: ${p.hours_per_week ?? '[hours]'} a week. Starts ${fmtDate(p.starts_on)}. Reviewed on ${fmtDate(p.review_on)}, or sooner if a new certificate changes the restrictions.`, '',
      '## Who does what', '', `- ${c.worker}: work within the restrictions and tell the supervisor if anything hurts.`, `- Supervisor: keep the duties inside the restrictions.`,
      `- ${c.rtw_coordinator || 'Return to work coordinator'}: check in weekly and arrange the review.`, '',
      '## Agreed', '', '| Name | Role | Signature | Date |', '|---|---|---|---|', `| ${c.worker} | Worker | | |`, `| ${c.rtw_coordinator || ''} | Return to work coordinator | | |`, '| | Supervisor | | |', '',
      `<!-- Draft. When signed, record it: /agree-plan ${p.ref} --by="<names>" --date=<date> -->`];
    return { file: draftFile(`rtw-plan-${p.ref}.md`, body.join('\n') + '\n') };
  },
  // The written cover decision an ACC Accredited Employer owes the claimant (ss 56 to 58, 64).
  async 'draft-cover-decision'(db, [term]) {
    const c = await claim(db, term);
    if (c.arrangement !== 'accredited') throw Error(`${c.ref} is not an accredited employer claim: the insurer writes the decision`);
    if (c.liability === 'pending') throw Error(`No decision recorded on ${c.ref}. Record it with /liability first.`);
    const reason = (await db.query(`select body from notes where claim_id = $1 and body like 'Decision %' order by at desc limit 1`, [c.id]))[0]?.body;
    const [dl] = await db.query(`select standing from v_deadlines where claim_id = $1 and item = 'cover decision'`, [c.id]);
    const deemed = dl?.standing === 'done late' || dl?.standing === 'deemed';
    const accepted = ['accepted', 'provisional', 'deemed'].includes(c.liability);
    const body = [`To: ${c.worker}`, `Subject: Your claim ${c.claim_number || c.ref}: cover decision`, '', `Kia ora ${c.worker.split(' ')[0]},`, '',
      accepted ? `We have accepted cover for your ${c.nature.toLowerCase()} from ${fmtDate(c.injured_on)}${deemed ? '. Our decision was not made within the time the law allows, so you have cover by law from the date that time ran out (Accident Compensation Act 2001 s 58)' : ''}.`
        : `We are not able to accept cover for your claim for ${c.nature.toLowerCase()} from ${fmtDate(c.injured_on)}. ${reason ? reason.replace(/^Decision declined: /, 'The reason: ') : '[the reason, in plain words]'}`, '',
      accepted ? `${c.rtw_coordinator || 'Our case manager'} will be in touch about treatment and getting back to work.` : 'If you disagree with this decision you can ask for a review. The review must be lodged within three months of this letter. [Add the review details your accreditation agreement requires.]', '',
      'Ngā mihi,', c.case_manager || '[case manager]', '', '<!-- Draft, not sent. Check it against your accreditation agreement before it goes. -->'];
    return { file: draftFile(`cover-decision-${c.ref}.md`, body.join('\n') + '\n'), decision: c.liability, deemed };
  },
};

// ------------------------------------------------------------------ import and export

// Column names a Solv injury or claim export typically carries, with plain alternatives. --map overrides any of them.
const MAPS = {
  workers: { code: ['Employee ID', 'Employee Number', 'Payroll Number', 'Code'], name: ['Employee Name', 'Full Name', 'Name', 'Worker'], first: ['First Name', 'Given Name'], last: ['Last Name', 'Surname'],
    dob: ['Date of Birth', 'DOB'], role: ['Occupation', 'Position', 'Job Title'], email: ['Email'], site: ['Site', 'Location', 'Business Unit'], started: ['Start Date', 'Commencement Date'],
    piawe: ['PIAWE', 'Pre-Injury Average Weekly Earnings', 'Weekly Earnings'] },
  injuries: { id: ['Injury Number', 'Injury ID', 'Incident Number', 'ID'], worker: ['Employee ID', 'Employee Number', 'Payroll Number'], occurred: ['Date of Injury', 'Injury Date', 'Incident Date'],
    time: ['Time of Injury', 'Injury Time'], aware: ['Date Reported', 'Reported Date', 'Date Notified to Employer'], mechanism: ['Mechanism of Incident', 'Mechanism', 'Cause'], nature: ['Nature of Injury', 'Injury Type', 'Nature'],
    body: ['Bodily Location', 'Body Part', 'Body Location'], severity: ['Injury Classification', 'Classification', 'Severity'], description: ['Description', 'Injury Description'],
    location: ['Location of Incident', 'Location'] },
  claims: { injury: ['Injury Number', 'Injury ID', 'Incident Number'], number: ['Claim Number', 'Claim No'], received: ['Claim Received', 'Date Claim Received', 'Claim Lodged'],
    status: ['Claim Status', 'Status'], liability: ['Liability Status', 'Liability', 'Determination'], liability_on: ['Liability Date', 'Determination Date'], incapacity: ['First Day Off', 'Incapacity Start', 'Time Lost From'],
    closed: ['Date Closed', 'Closed Date'], estimate: ['Estimate', 'Case Estimate', 'Outstanding Estimate'], cm: ['Case Manager', 'Claims Officer'] },
};

function mapper(kind, mapFile) {
  const base = MAPS[kind];
  if (!base) throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
  const extra = mapFile ? JSON.parse(readFileSync(path.resolve(mapFile), 'utf8')) : {};
  return (row, field) => pick(row, ...(extra[field] ? [extra[field]] : []), ...(base[field] || []));
}
// "2026-10-21", "21/10/2026" (day first, as NZ and AU write it) -> 2026-10-21.
function looseDate(v, label) {
  const s = String(v || '').trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`, label);
  return date(s.slice(0, 10), label);
}
function severityOf(v) {
  const s = String(v || '').toLowerCase();
  if (/lost|lti|time lost|weekly/.test(s)) return 'lost-time';
  if (/medical|mti|treatment/.test(s)) return 'medical';
  if (/first/.test(s)) return 'first-aid';
  return s ? 'report-only' : 'medical';
}
function liabilityOf(v) {
  const s = String(v || '').toLowerCase();
  if (/provisional/.test(s)) return 'provisional';
  if (/reasonable/.test(s)) return 'reasonable-excuse';
  if (/accept|approved|full/.test(s)) return 'accepted';
  if (/declin|denied|reject/.test(s)) return 'declined';
  return 'pending';
}

async function importSolv(db, args, f) {
  const actor = actorOf(f);
  const [source, file] = args;
  if (source !== 'solv') throw Error('Usage: import solv <file.csv> --kind=workers|injuries|claims');
  if (!file || !existsSync(file)) throw Error(`File not found: ${file}`);
  need(f, 'kind');
  const kind = String(f.kind);
  const get = mapper(kind, f.map);
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const counts = { rows: rows.length, added: 0, skipped: 0 };
  const dflt = f.site ? await site(db, f.site) : null;
  await db.exec('begin');
  try {
    for (const [n, r] of rows.entries()) {
      const at = `row ${n + 2}`;
      try {
        if (kind === 'workers') {
          if (!get(r, 'code')) throw Error('no employee ID');
          const ext = `solv:${get(r, 'code')}`;
          if ((await db.query('select 1 from workers where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const s = get(r, 'site') ? await site(db, get(r, 'site')).catch(() => null) : dflt;
          if (!s) throw Error(`site "${get(r, 'site')}" not found: add it first, or pass --site`);
          const name = get(r, 'name') || `${get(r, 'first')} ${get(r, 'last')}`.trim();
          if (!name) throw Error('no employee name');
          await db.query(`insert into workers (code, site_id, name, dob, role, email, started_on, piawe_cents, external_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [String(get(r, 'code')).toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 16), s.id, name, get(r, 'dob') ? looseDate(get(r, 'dob'), `dob (${at})`) : null, get(r, 'role') || null,
              get(r, 'email') || null, get(r, 'started') ? looseDate(get(r, 'started'), `start date (${at})`) : null, get(r, 'piawe') ? cents(get(r, 'piawe'), `PIAWE (${at})`) : null, ext]);
        } else if (kind === 'injuries') {
          if (!get(r, 'id')) throw Error('no injury number');
          const ext = `solv:${get(r, 'id')}`;
          if ((await db.query('select 1 from injuries where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const w = await db.query('select id, site_id from workers where external_id = $1 or code = upper($2)', [`solv:${get(r, 'worker')}`, get(r, 'worker')]);
          if (w.length !== 1) throw Error(`employee "${get(r, 'worker')}" not found (import workers first)`);
          const day = looseDate(get(r, 'occurred'), `date of injury (${at})`);
          const time = /^\d{1,2}:\d{2}/.test(get(r, 'time')) ? get(r, 'time').slice(0, 5) : '00:00';
          const occurred = stamp(`${day} ${time}`, `time of injury (${at})`);
          const aware = get(r, 'aware') ? `${looseDate(get(r, 'aware'), `date reported (${at})`)} ${time}:00` : occurred;
          if (!get(r, 'mechanism') && !get(r, 'nature')) throw Error('no mechanism or nature of injury');
          const ref = await nextRef(db, 'injuries', 'INJ-', 4);
          // History comes across as already registered and notified: Solv held those steps.
          await db.query(`insert into injuries (ref, worker_id, site_id, occurred_at, aware_at, location, mechanism, nature, body_part, description, severity, insurer_notified_at, registered_on, external_id)
            values ($1,$2,$3,$4,greatest($5::timestamp, $4::timestamp),$6,$7,$8,$9,$10,$11,greatest($5::timestamp, $4::timestamp),$12,$13)`,
            [ref, w[0].id, w[0].site_id, occurred, aware, get(r, 'location') || null, get(r, 'mechanism') || 'not recorded', get(r, 'nature') || 'not recorded', get(r, 'body') || null,
              get(r, 'description') || 'Imported from Solv', severityOf(get(r, 'severity')), day, ext]);
        } else if (kind === 'claims') {
          if (!get(r, 'injury')) throw Error('no injury number');
          const ext = `solv:claim:${get(r, 'injury')}`;
          if ((await db.query('select 1 from claims where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const inj = await db.query('select id, ref, occurred_at::date as day from injuries where external_id = $1', [`solv:${get(r, 'injury')}`]);
          if (inj.length !== 1) throw Error(`injury "${get(r, 'injury')}" not found (import injuries first)`);
          const received = get(r, 'received') ? looseDate(get(r, 'received'), `claim received (${at})`) : String(inj[0].day instanceof Date ? inj[0].day.toISOString() : inj[0].day).slice(0, 10);
          const liability = liabilityOf(get(r, 'liability'));
          const closed = get(r, 'closed') || /closed|finali/i.test(get(r, 'status')) ? looseDate(get(r, 'closed') || received, `date closed (${at})`) : null;
          const incap = get(r, 'incapacity') ? looseDate(get(r, 'incapacity'), `first day off (${at})`) : null;
          await db.query(`insert into claims (ref, injury_id, claim_number, received_on, weekly, incapacity_from, forwarded_on, liability, liability_on, estimate_cents, case_manager, status, closed_on, closed_reason, external_id)
            values ($1,$2,$3,$4,$5,$6,$4,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [`CLM-${inj[0].ref.replace(/^INJ-/, '')}`, inj[0].id, get(r, 'number') || null, received, !!incap, incap, liability,
              liability === 'pending' ? null : get(r, 'liability_on') ? looseDate(get(r, 'liability_on'), `liability date (${at})`) : received,
              get(r, 'estimate') ? cents(get(r, 'estimate'), `estimate (${at})`) : null, get(r, 'cm') || null, closed ? 'closed' : 'open', closed, closed ? 'Closed in Solv' : null, ext]);
        } else throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
        counts.added++;
      } catch (err) {
        throw Error(`${at}: ${err.message}. Nothing was imported.`);
      }
    }
    if (f['dry-run']) { await db.exec('rollback'); return { ...counts, dry_run: true, next: 'Run again without --dry-run to keep it' }; }
    await log(db, actor, 'import', `solv-${kind}`, `${path.basename(file)}: ${counts.added} added, ${counts.skipped} already here`);
    await db.exec('commit');
    return counts;
  } catch (err) {
    await db.exec('rollback');
    throw err;
  }
}

async function exportAll(db, args, f) {
  const tables = ['settings', 'sites', 'workers', 'injuries', 'claims', 'certificates', 'rtw_plans', 'payments', 'actions', 'notes', 'activity'];
  const out = { exported_at: new Date().toISOString(), note: 'Confidential injury and health information. Keep this file as securely as the database.', tables: {} };
  for (const t of tables) out.tables[t] = await db.query(`select * from ${t}`);
  const file = path.resolve(f.out || path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'exports', `injury-claims-${today()}.json`));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 2), { mode: 0o600 });
  return { file, rows: Object.fromEntries(tables.map((t) => [t, out.tables[t].length])) };
}

const all = { ...reads, ...writes, ...drafts, import: importSolv, export: exportAll };
export const commands = Object.keys(all).sort();

export async function run(db, command, args = [], flags = {}) {
  const fn = all[command];
  if (!fn) throw Error(`Unknown command "${command}". Commands: ${commands.join(', ')}`);
  return fn(db, args, flags);
}
