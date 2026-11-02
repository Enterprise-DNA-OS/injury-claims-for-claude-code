#!/usr/bin/env node
// npm test: a temporary database, the demo business, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, drafts, commands, QUESTIONS, cents, stamp, date, today } from './lib/domain.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'claims-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re, msg) => { await assert.rejects(fn, re, msg); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const A = { actor: 'Test' };
const one = async (sql, p = []) => (await db.query(sql, p))[0];
const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ahead = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const deadline = async (ref, item) => one('select * from v_deadlines where ref = $1 and item = $2', [ref, item]);

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  await seed(db);
  eq((await one('select count(*)::int as n from workers')).n, 12, 'seed is idempotent (workers)');
  eq((await one('select count(*)::int as n from injuries')).n, 12, 'seed is idempotent (injuries)');
  eq((await one('select count(*)::int as n from claims')).n, 8, 'seed is idempotent (claims)');
  eq((await one('select count(*)::int as n from notes')).n, 7, 'seed is idempotent (notes)');
  eq((await one('select count(*)::int as n from activity')).n, 3, 'seed activity written once');

  // Every read runs.
  for (const cmd of Object.keys(reads)) {
    const a = { site: ['SYD'], worker: ['Priya'], injury: ['INJ-0004'], claim: ['CLM-0002'], weekly: ['CLM-0006'] }[cmd] || [];
    ok(await call(cmd, a, {}), `read ${cmd}`);
  }
  eq(QUESTIONS.length, 10, 'ten questions');
  const ins = await call('insights');
  ok(ins.every((q) => Array.isArray(q.rows)), 'every question returns rows');
  ok(ins[5].rows.some((r) => r.insurer === 'WorkSafe Victoria agent' && r.oldest_days >= 80), 'reimbursements by insurer, oldest first');

  // Parsing is strict.
  eq(cents('1,450.00', 'x'), 145000);
  eq(cents('$98', 'x'), 9800);
  assert.throws(() => cents('12.345', 'x'), /amount/); checks++;
  eq(stamp('2026-10-21 6:05', 'x'), '2026-10-21 06:05:00');
  assert.throws(() => stamp('2026-10-21 24:00', 'x'), /impossible/); checks++;
  assert.throws(() => date('2026-02-30', 'x'), /date/); checks++;

  // The rules in the database.
  const r = await one(`select weekly_rate_pct('NSW', 5, 0) as n5, weekly_rate_pct('NSW', 20, 10) as n20, weekly_rate_pct('NSW', 20, 15) as n20w, weekly_rate_pct('NSW', 131, 0) as n131,
    weekly_rate_pct('VIC', 13, 0) as v13, weekly_rate_pct('VIC', 14, 0) as v14, weekly_rate_pct('NZ', 3, 0) as nz, weekly_rate_pct('WA', 3, 0) as wa,
    weekly_amount_cents('NSW', 20, 100000, 30000, 20) as a1, weekly_amount_cents('VIC', 20, 100000, 30000, 20) as a2, weekly_amount_cents('NZ', 3, 100000, 10000, 10) as a3,
    weekly_amount_cents('NSW', 2, 100000, 99000, 30) as a4,
    add_business_days('2026-11-06', 3)::text as bd, add_business_days('2026-11-02', 8)::text as bd8`);
  eq(Number(r.n5), 95, 'NSW s 36 weeks 1 to 13'); eq(Number(r.n20), 80, 'NSW s 37 under 15 hours'); eq(Number(r.n20w), 95, 'NSW s 37 15 hours or more');
  eq(r.n131, null, 'no built-in rate past week 130');
  eq(Number(r.v13), 95, 'Vic first entitlement period'); eq(Number(r.v14), 80, 'Vic second entitlement period');
  eq(Number(r.nz), 80, 'ACC 80%'); eq(r.wa, null, 'no guessed rate for WA');
  eq(r.a1, 65000, 'NSW: 95% x PIAWE less earnings (working 20 hours)');
  eq(r.a2, 56000, 'Vic week 14 on: 80% of (PIAWE less earnings)');
  eq(r.a3, null, 'ACC abatement is not guessed');
  eq(r.a4, 0, 'never below zero');
  eq(r.bd, '2026-11-11', 'business days skip the weekend'); eq(r.bd8, '2026-11-12', '8 business days');
  await call('set', ['max_weekly_cents_nsw', '60000'], A);
  eq((await one(`select weekly_amount_cents('NSW', 20, 100000, 30000, 20) as a`)).a, 60000, 'capped at the indexed maximum once set');
  await call('set', ['max_weekly_cents_nsw', '99999999'], A);

  // The demo business says what it should.
  const att = await call('attention');
  const has = (item, ref) => att.some((x) => x.item === item && (!ref || x.ref === ref));
  ok(has('insurer notice overdue', 'INJ-0001'), 'NSW 48 hours missed');
  ok(has('insurer notice overdue', 'INJ-0007'), 'Qld 8 business days missed');
  ok(has('register of injuries overdue', 'INJ-0003'), 'NSW register entry missing');
  ok(has('regulator notice overdue', 'INJ-0004'), 'notifiable incident not notified');
  ok(has('claim to agent overdue', 'CLM-0004'), 'Vic claim not forwarded in 10 days');
  ok(has('mental injury notice overdue', 'CLM-0005'), 'Vic mental injury notice missed');
  ok(has('cover deemed: decision missed', 'CLM-0009'), 'NZ 21 days passed: deemed cover');
  ok(has('first week compensation overdue', 'CLM-0009'), 'first week compensation not paid');
  ok(has('certificate expired', 'CLM-0002'), 'expired certificate');
  ok(has('plan review missed', 'RTW-001'), 'plan review missed');
  ok(has('reimbursement to chase', 'PAY-0007'), 'reimbursement over 30 days');
  ok(!has('reimbursement to chase', 'PAY-0003'), 'recent reimbursement not chased yet');
  ok(has('gone quiet', 'CLM-0006'), 'quiet claim');
  ok(has('action overdue', 'ACT-001'), 'overdue action');
  ok(!att.some((x) => ['CLM-0011', 'INJ-0011'].includes(x.ref)), 'closed claim stays quiet');
  ok(!has('insurer notice overdue', 'INJ-0003'), 'first aid needs no insurer notice');
  eq(att[0].item.includes('overdue') || att[0].item.includes('deemed'), true, 'law first');
  eq((await deadline('CLM-0010', 'cover decision')).standing, 'open', '21 days not yet up');
  const comp = await call('compliance');
  ok(comp.rules.find((x) => x.rule === 'insurer notice').breached === 2, 'compliance counts both late insurer notices');
  eq(comp.breaches.length, 8, 'eight breaches in the demo');

  // A new NSW injury starts the 48-hour clock; telling the insurer stops it.
  const rep = await call('report-injury', ['Josh'], { ...A, occurred: `${today()} 07:30`, mechanism: 'Hand caught in a roller', nature: 'Crush injury', severity: 'lost-time', 'body-part': 'Right hand' });
  eq(rep.injury, 'INJ-0013');
  ok(rep.deadlines.some((x) => x.item === 'insurer notice' && ['open', 'due soon'].includes(x.standing)), '48 hours running');
  ok(rep.deadlines.some((x) => x.item === 'register of injuries'), 'register clock running');
  await fails(async () => call('report-injury', ['Josh'], { ...A, occurred: `${ahead(2)} 07:30`, mechanism: 'x', nature: 'y', severity: 'medical' }), /future/);
  await fails(async () => call('report-injury', ['Josh'], { ...A, occurred: `${today()} 07:30`, mechanism: 'x', nature: 'y', severity: 'bad' }), /--severity/);
  await fails(async () => call('report-injury', ['a'], { ...A, occurred: `${today()} 07:30`, mechanism: 'x', nature: 'y', severity: 'medical' }), /ambiguous/);
  await call('registered', ['INJ-0013'], A);
  const told = await call('notify-insurer', ['INJ-0013'], A);
  eq(told.standing, 'done', 'told within 48 hours');
  await fails(async () => call('notify-insurer', ['INJ-0012'], A), /accredited/);
  await call('notify-insurer', ['INJ-0001'], { ...A, at: `${ago(0)} 06:00` });
  eq((await deadline('INJ-0001', 'insurer notice')).standing, 'done late', 'late notice stays on the record as late');

  // Notifiable incidents.
  await fails(async () => call('notify-regulator', ['INJ-0013'], { ...A, reference: 'X' }), /not marked notifiable/);
  await call('set-notifiable', ['INJ-0013'], A);
  const nr = await call('notify-regulator', ['INJ-0013'], { ...A, reference: 'SWN-1' });
  eq(nr.regulator, 'SafeWork NSW');
  await fails(async () => db.query(`update injuries set regulator_notified_at = now() where ref = 'INJ-0003'`), /check|violates/i, 'database refuses a notice on a non-notifiable injury');

  // Claims: NSW 7 days to forward, liability, certificates, plans, money.
  const lc = await call('lodge-claim', ['INJ-0013'], { ...A, received: today(), weekly: true, 'incapacity-from': today(), doctor: 'Dr Amir Haddad' });
  eq(lc.claim, 'CLM-0013');
  ok(lc.deadlines.some((x) => x.item === 'claim to insurer'), 'NSW s 261 clock');
  await fails(async () => call('lodge-claim', ['INJ-0013'], { ...A, received: today() }), /already has a claim/);
  await fails(async () => call('lodge-claim', ['INJ-0001'], { ...A, received: today(), weekly: true }), /incapacity-from/);
  await call('forward-claim', ['CLM-0013'], { ...A, number: '24A1100991' });
  eq((await call('claim', ['24A1100991'])).claim.ref, 'CLM-0013', 'find a claim by the insurer\'s number');
  await fails(async () => call('liability', ['CLM-0013'], { ...A, decision: 'declined' }), /--reason/);
  await call('liability', ['CLM-0013'], { ...A, decision: 'provisional' });
  await fails(async () => call('certificate', ['CLM-0013'], { ...A, from: today(), to: ahead(14), capacity: 'suitable' }), /--restrictions/);
  await fails(async () => call('certificate', ['CLM-0013'], { ...A, from: today(), to: ago(3), capacity: 'none' }), /before/);
  await call('certificate', ['CLM-0013'], { ...A, from: today(), to: ahead(3), capacity: 'none' });
  await fails(async () => call('add-plan', ['CLM-0013'], { ...A, starts: today(), review: ahead(14), duties: 'x' }), /no capacity/);
  const cert = await call('certificate', ['CLM-0013'], { ...A, from: ahead(4), to: ahead(18), capacity: 'suitable', hours: '20', restrictions: 'Left hand only' });
  ok(/plan/.test(cert.next), 'suitable capacity asks for a plan');
  await fails(async () => call('add-plan', ['CLM-0013'], { ...A, starts: today(), review: ahead(14), duties: 'Stores desk', hours: '30' }), /more than the certificate/);
  const pl = await call('add-plan', ['CLM-0013'], { ...A, starts: ahead(4), review: ahead(18), duties: 'Stores desk, one-handed', hours: '20' });
  await fails(async () => call('agree-plan', [pl.plan], A), /--by/);
  await call('agree-plan', [pl.plan], { ...A, by: 'Josh Kelly, Leah Morgan' });
  await fails(async () => call('agree-plan', [pl.plan], { ...A, by: 'x' }), /already agreed/);
  eq((await call('claim', ['CLM-0013'])).claim.plan_status, 'agreed');
  const p1 = await call('pay', ['CLM-0013'], { ...A, kind: 'weekly', from: ago(6), to: today(), payee: 'Josh Kelly', amount: '1149.50', reimbursable: true });
  await fails(async () => call('pay', ['CLM-0013'], { ...A, kind: 'weekly', from: ago(3), to: ago(1), payee: 'Josh Kelly', amount: '100' }), /overlaps/);
  await fails(async () => call('pay', ['CLM-0013'], { ...A, kind: 'first-week', payee: 'Josh Kelly', amount: '100' }), /New Zealand/);
  await call('pay', ['CLM-0013'], { ...A, kind: 'medical', payee: 'Westmead Hospital', amount: '420', invoice: 'WH-1' });
  await fails(async () => call('pay', ['CLM-0013'], { ...A, kind: 'medical', payee: 'Westmead Hospital', amount: '420', invoice: 'WH-1' }), /already paid/);
  await call('reimbursed', [p1.payment], A);
  await fails(async () => call('reimbursed', [p1.payment], A), /already reimbursed/);
  await fails(async () => call('reimbursed', ['PAY-0004'], A), /not marked/);
  const wk = await call('weekly', ['CLM-0013'], { earnings: '600', hours: '20' });
  eq(wk.rate_pct, 95); eq(wk.amount_cents, Math.round(0.95 * 121000) - 60000, 'weekly amount from PIAWE and earnings');
  await call('estimate', ['CLM-0013'], { ...A, amount: '22000' });
  await call('note', ['CLM-0013'], { ...A, kind: 'call', who: 'Josh Kelly', text: 'Starting on the stores desk Monday.' });
  await fails(async () => call('note', ['CLM-0013'], { ...A, kind: 'fax', text: 'x' }), /--kind/);
  await fails(async () => call('close-claim', ['CLM-0004'], { ...A, reason: 'x' }), /legal deadline open/);
  await call('certificate', ['CLM-0013'], { ...A, from: ahead(19), to: ahead(30), capacity: 'full' });
  await call('close-claim', ['CLM-0013'], { ...A, reason: 'Back at full duties' });
  eq((await one(`select status from rtw_plans where ref = $1`, [pl.plan])).status, 'ended', 'closing a claim ends its plan');
  await call('reopen-claim', ['CLM-0013'], { ...A, reason: 'Pain returned' });
  eq((await call('claim', ['CLM-0013'])).claim.status, 'open');

  // Victoria: forwarding, the mental injury notice, the agent's 28 days.
  await call('forward-claim', ['CLM-0004'], A);
  eq((await deadline('CLM-0004', 'claim to agent')).standing, 'done late');
  await call('notify-authority', ['CLM-0005'], A);
  await fails(async () => call('notify-authority', ['CLM-0006'], A), /mental injury/);
  await fails(async () => call('forward-claim', ['CLM-0012'], A), /accredited/);

  // New Zealand accredited employer: deemed cover cannot be declined; first week compensation.
  await fails(async () => call('liability', ['CLM-0009'], { ...A, decision: 'declined', reason: 'Not at work' }), /deemed/);
  await call('liability', ['CLM-0009'], { ...A, decision: 'accepted' });
  eq((await deadline('CLM-0009', 'cover decision')).standing, 'done late');
  await call('pay', ['CLM-0009'], { ...A, kind: 'first-week', from: ago(24), to: ago(18), payee: 'Daniel Fale', amount: '1000' });
  eq((await deadline('CLM-0009', 'first week compensation')).standing, 'done late');
  await call('liability', ['CLM-0010'], { ...A, decision: 'declined', reason: 'The wrist ache started before the packing role and is not work-related on the GP notes' });
  eq((await deadline('CLM-0010', 'cover decision')).standing, 'done', 'decided inside 21 days');

  // Actions and settings.
  const act = await call('add-action', ['INJ-0013'], { ...A, what: 'Guard the roller', due: ahead(7) });
  await fails(async () => call('close-action', [act.action], A), /--outcome/);
  await call('close-action', [act.action], { ...A, outcome: 'Guard fitted' });
  await fails(async () => call('set', ['quiet_days', 'soon'], A), /number/);
  await call('worker-status', ['Ana'], { ...A, status: 'left' });
  eq((await call('workers', [], { site: 'SYD' })).find((w) => w.code === 'W-203').status, 'left');
  await call('add-site', [], { ...A, code: 'PER', name: 'Ridgeline Foods Kewdale', jurisdiction: 'WA', arrangement: 'insured', insurer: 'An approved insurer' });
  await fails(async () => call('add-site', [], { ...A, code: 'ADL', name: 'X', jurisdiction: 'SA', arrangement: 'accredited' }), /New Zealand only/);
  await call('add-worker', [], { ...A, code: 'W-501', name: 'Rhys Evans', site: 'PER', piawe: '1300' });
  const wa = await call('report-injury', ['Rhys'], { ...A, occurred: `${today()} 09:00`, mechanism: 'Fall on stairs', nature: 'Sprain', severity: 'lost-time' });
  eq(wa.deadlines.length, 0, 'no rule invented for WA');
  await call('lodge-claim', [wa.injury], { ...A, received: today(), weekly: true, 'incapacity-from': today() });
  const waWeekly = await call('weekly', [wa.injury.replace('INJ', 'CLM')], {});
  eq(waWeekly.amount_cents, null, 'WA weekly amount is not guessed'); ok(/No rate is built in/.test(waWeekly.rule));

  // Drafts go to drafts/ and are never sent.
  for (const [cmd, a] of [['weekly-review', []], ['draft-insurer-notice', ['INJ-0007']], ['draft-doctor-letter', ['CLM-0004']], ['draft-rtw-plan', ['RTW-003']], ['draft-cover-decision', ['CLM-0010']]]) {
    const d = await call(cmd, a, {});
    const body = readFileSync(path.join(process.env.OUTPUT_DIR, d.file), 'utf8');
    ok(body.length > 200 && !body.includes('undefined') && !body.includes('\u2014'), `${cmd} drafted`);
  }
  ok(readFileSync(path.join(process.env.OUTPUT_DIR, (await call('draft-cover-decision', ['CLM-0009'])).file), 'utf8').includes('s 58'), 'deemed cover letter cites s 58');
  ok(readFileSync(path.join(process.env.OUTPUT_DIR, (await call('draft-cover-decision', ['CLM-0010'])).file), 'utf8').includes('not work-related'), 'decline letter gives the reason');
  await fails(async () => call('draft-cover-decision', ['CLM-0006']), /not an accredited/);
  await fails(async () => call('draft-insurer-notice', ['INJ-0009']), /accredited/);
  eq(Object.keys(drafts).length, 5, 'five drafts');

  // Import from a Solv export: dry run, repeats skipped, a bad row stops the file.
  const ex = path.join(REPO_ROOT, 'examples', 'solv');
  const dry = await call('import', ['solv', path.join(ex, 'employees.csv')], { ...A, kind: 'workers', 'dry-run': true });
  ok(dry.dry_run && dry.added === 2, 'dry run counts');
  eq((await one(`select count(*)::int as n from workers where external_id like 'solv:%'`)).n, 0, 'dry run keeps nothing');
  eq((await call('import', ['solv', path.join(ex, 'employees.csv')], { ...A, kind: 'workers' })).added, 2);
  eq((await call('import', ['solv', path.join(ex, 'injuries.csv')], { ...A, kind: 'injuries' })).added, 2);
  eq((await call('import', ['solv', path.join(ex, 'claims.csv')], { ...A, kind: 'claims' })).added, 2);
  eq((await call('import', ['solv', path.join(ex, 'claims.csv')], { ...A, kind: 'claims' })).skipped, 2, 'a second import skips repeats');
  eq((await one(`select piawe_cents from workers where external_id = 'solv:E1043'`)).piawe_cents, 138500, 'PIAWE comes across');
  eq((await one(`select occurred_at::text as t from injuries where external_id = 'solv:I-2291'`)).t, '2026-03-12 10:20:00', 'day-first dates and times read correctly');
  eq((await one(`select severity from injuries where external_id = 'solv:I-2291'`)).severity, 'lost-time');
  const ic = await one(`select c.status, c.liability, c.weekly from claims c join injuries i on i.id = c.injury_id where i.external_id = 'solv:I-2291'`);
  ok(ic.status === 'closed' && ic.liability === 'accepted' && ic.weekly, 'claim history comes across');
  ok(!(await call('attention')).some((x) => /I-2291|E1043/.test(x.detail)), 'imported history does not flood the attention list');
  const bad = path.join(root, 'bad.csv');
  writeFileSync(bad, 'Injury Number,Employee ID,Date of Injury,Mechanism of Incident,Nature of Injury\nI-9001,E1043,01/10/2026,Slip,Sprain\nI-9002,E9999,01/10/2026,Slip,Sprain\n');
  const before = (await one('select count(*)::int as n from injuries')).n;
  await fails(async () => call('import', ['solv', bad], { ...A, kind: 'injuries' }), /row 3: employee "E9999" not found.*Nothing was imported/);
  eq((await one('select count(*)::int as n from injuries')).n, before, 'a bad row stops the whole file');
  await fails(async () => call('import', ['solv', bad], { ...A, kind: 'payroll' }), /--kind/);
  await fails(async () => call('import', ['figtree', bad], { ...A, kind: 'injuries' }), /Usage/);

  // Export, activity, and records that cannot be rewritten or deleted.
  const exp = await call('export', [], {});
  ok(existsSync(exp.file) && exp.rows.claims > 0, 'export writes every table');
  ok((await call('activity', [], { days: '1' })).length > 30, 'activity log fills');
  await fails(async () => db.query('update activity set detail = $1', ['rewritten']), /append-only/);
  await fails(async () => db.query('delete from activity'), /append-only/);
  await fails(async () => db.query(`delete from claims where ref = 'CLM-0011'`), /kept/);
  await fails(async () => db.query(`delete from injuries where ref = 'INJ-0003'`), /kept/);
  await fails(async () => db.query(`update claims set status = 'closed' where ref = 'CLM-0002'`), /check|violates/i, 'a closed claim needs a close date');
  await fails(async () => db.query(`insert into sites (code, name, jurisdiction, arrangement) values ('ZZ', 'Z', 'VIC', 'accredited')`), /check|violates/i);
  await fails(async () => call('nonsense'), /Unknown command/);

  // The CLI shell, views and documents.
  const env = { ...process.env };
  const cli = (a) => spawnSync(process.execPath, ['scripts/claims.mjs', ...a], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  const h = cli(['--help']);
  eq(h.status, 0); ok(h.stdout.includes('report-injury'), 'help lists commands');
  const j = cli(['deadlines', '--json']);
  eq(j.status, 0); ok(Array.isArray(JSON.parse(j.stdout)), 'json output');
  const t = cli(['attention']);
  eq(t.status, 0); ok(t.stdout.includes('regulator notice overdue'), 'human output');
  const wcli = cli(['note', 'CLM-0006', '--kind=call', '--who=Tom Nguyen', '--text=Checked in after the review', '--actor=Test']);
  eq(wcli.status, 0, wcli.stderr); ok(wcli.stdout.includes('CLM-0006'), 'a write through the CLI');
  const u = cli(['attention', '--bogus']);
  eq(u.status, 1); ok(u.stderr.includes('Unknown option'), 'unknown option refused');
  const v = spawnSync(process.execPath, ['scripts/view.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(v.status, 0, v.stderr);
  const views = JSON.parse(readFileSync(path.join(REPO_ROOT, 'views.json'), 'utf8'));
  for (const vw of views) ok(existsSync(path.join(process.env.OUTPUT_DIR, 'views', `${vw.name}.html`)), `view ${vw.name}`);
  const page = readFileSync(path.join(process.env.OUTPUT_DIR, 'views', 'week.html'), 'utf8');
  ok(!page.includes('TODO') && page.includes('Needs attention') && page.includes('INJ-0004'), 'week view rendered');
  const d = spawnSync(process.execPath, ['scripts/docs.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(d.status, 0, d.stderr);
  const docs = JSON.parse(readFileSync(path.join(REPO_ROOT, 'documents.json'), 'utf8'));
  for (const doc of docs) ok(readdirSync(path.join(process.env.OUTPUT_DIR, 'docs-out', doc.name)).length > 0, `document ${doc.name}`);
  const { page: renderPage, table: renderTable } = await import('./lib/render.mjs');
  const html = renderPage({ title: 'T', subtitle: '<script>alert(1)</script>', sections: [{ title: 'S', html: renderTable([{ name: '<b>x</b>' }]) }] });
  ok(!html.includes('<script>alert') && html.includes('&lt;script&gt;'), 'HTML is escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
  const special = ['customise', 'new-view', 'view', 'documents'];
  for (const c of commands) ok(recipes.includes(c), `/${c} has a recipe`);
  for (const r of recipes) ok(commands.includes(r) || special.includes(r), `/${r} drives a real command`);
  const claude = readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  for (const r of recipes) ok(claude.includes(`/${r}\``), `CLAUDE.md routes /${r}`);
  ok(!claude.includes('TODO(author)') && !readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').includes('TODO(author)'), 'no TODO(author) left');

  console.log(`PASS: ${checks} checks (${db.mode})`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}
