-- Demo data: Ridgeline Foods, a fictional food manufacturer with four sites: an ACC Accredited
-- Employer plant in Auckland, and insured sites in Wetherill Park (NSW), Dandenong (Victoria) and
-- Brisbane. Every name, injury and figure here is invented. Dates are relative to today, so the
-- attention list always has something to say: an insurer not told within 48 hours, an injury not
-- in the register, a Victorian claim not forwarded in 10 days, a notifiable incident the regulator
-- has not heard about, a mental injury claim WorkSafe has not been told of, a Queensland injury past
-- 8 business days, an Auckland claim past 21 days with no decision (deemed cover), first week
-- compensation not paid, a certificate that has run out, a plan review missed, a reimbursement the
-- agent has sat on for seven weeks, and a claim nobody has touched in three weeks.
-- Safe to run twice: every row has a natural key.

insert into settings (key, value, note) values
  ('quiet_days', '14', 'House rule: an open claim with no case note for this many days is flagged'),
  ('cert_warn_days', '3', 'House rule: flag a certificate this many days before it runs out'),
  ('rtw_plan_days', '10', 'House rule: days after a suitable-capacity certificate to have a plan agreed'),
  ('reimburse_chase_days', '30', 'House rule: days after paying before a reimbursement is chased'),
  ('gp_letter_days', '7', 'House rule: days before a certificate ends to write to the treating doctor about suitable duties')
on conflict (key) do nothing;

insert into sites (code, name, jurisdiction, arrangement, insurer, policy_number, address, rtw_coordinator) values
  ('AKL', 'Ridgeline Foods Auckland', 'NZ', 'accredited', 'Ridgeline Foods (ACC Accredited Employer)', 'AEP-0417', '14 Kahu Road, East Tamaki, Auckland', 'Hana Ruru'),
  ('SYD', 'Ridgeline Foods Wetherill Park', 'NSW', 'insured', 'icare NSW', 'WC-118204-7', '22 Victoria Street, Wetherill Park NSW', 'Leah Morgan'),
  ('MEL', 'Ridgeline Foods Dandenong', 'VIC', 'insured', 'WorkSafe Victoria agent', 'VWA-77310-2', '9 Frankston Road, Dandenong VIC', 'Chris Pappas'),
  ('BNE', 'Ridgeline Foods Brisbane', 'QLD', 'insured', 'WorkCover Queensland', 'WCQ-55120', '31 Kerry Road, Archerfield QLD', 'Jade Wilson')
on conflict (code) do nothing;

insert into workers (code, site_id, name, dob, role, email, started_on, hours_per_week, piawe_cents)
select v.code, s.id, v.name, v.dob::date, v.role, v.email, v.started::date, v.hours, v.piawe
from (values
  ('W-101', 'AKL', 'Mere Tane', '1984-03-12', 'Process worker', 'mere.tane@example.com', '2019-06-03', 40, 118000),
  ('W-102', 'AKL', 'Daniel Fale', '1991-11-02', 'Forklift operator', 'daniel.fale@example.com', '2021-02-15', 45, 125000),
  ('W-103', 'AKL', 'Aroha Wiremu', '1996-07-21', 'Packer', 'aroha.wiremu@example.com', '2022-08-01', 40, 98000),
  ('W-104', 'AKL', 'Liam Chen', '1988-01-30', 'Maintenance fitter', 'liam.chen@example.com', '2017-04-10', 42, 139000),
  ('W-201', 'SYD', 'Priya Nair', '1987-05-14', 'Line lead', 'priya.nair@example.com', '2018-09-17', 38, 142000),
  ('W-202', 'SYD', 'Josh Kelly', '1993-10-08', 'Storeman', 'josh.kelly@example.com', '2023-01-09', 38, 121000),
  ('W-203', 'SYD', 'Ana Moala', '1999-02-25', 'Packer', 'ana.moala@example.com', '2024-03-04', 38, 104000),
  ('W-301', 'MEL', 'Marco Russo', '1982-08-19', 'Boner', 'marco.russo@example.com', '2016-05-23', 38, 138000),
  ('W-302', 'MEL', 'Sarah O''Neill', '1990-12-03', 'Quality officer', 'sarah.oneill@example.com', '2020-07-06', 38, 161000),
  ('W-303', 'MEL', 'Tom Nguyen', '1985-04-27', 'Delivery driver', 'tom.nguyen@example.com', '2019-11-11', 45, 152500),
  ('W-401', 'BNE', 'Kylie Brooks', '1994-06-16', 'Order picker', 'kylie.brooks@example.com', '2022-05-30', 38, 112000),
  ('W-402', 'BNE', 'Ben Walker', '1979-09-09', 'Sanitation lead', 'ben.walker@example.com', '2015-02-02', 40, 131000)
) as v(code, site, name, dob, role, email, started, hours, piawe)
join sites s on s.code = v.site
on conflict (code) do nothing;

insert into injuries (ref, worker_id, site_id, occurred_at, aware_at, reported_by, location, mechanism, nature, body_part, description, mental, severity,
  notifiable, regulator_notified_at, regulator_ref, insurer_notified_at, registered_on)
select v.ref, w.id, w.site_id, current_date + v.occ_day + v.occ_time::time, current_date + v.aware_day + v.aware_time::time, v.reported_by, v.location, v.mechanism, v.nature,
  v.body_part, v.description, v.mental, v.severity, v.notifiable,
  case when v.reg_day is null then null else current_date + v.reg_day + v.reg_time::time end, v.reg_ref,
  case when v.ins_day is null then null else current_date + v.ins_day + time '11:00' end,
  case when v.registered is null then null else current_date + v.registered end
from (values
  ('INJ-0001', 'W-202', -3, '09:40', -3, '10:00', 'Josh Kelly', 'Dispatch dock 2', 'Lifting cartons from a low pallet', 'Back strain', 'Lower back', 'Felt a sharp pain lifting a 16 kg carton from the bottom layer of a pallet. Went home at 11.', false, 'lost-time', false, null::int, null, null, null::int, -3),
  ('INJ-0002', 'W-201', -40, '14:20', -40, '14:30', 'Priya Nair', 'Line 3', 'Reaching overhead to clear a jam', 'Shoulder strain', 'Right shoulder', 'Pain clearing a film jam above head height, worse the next morning.', false, 'lost-time', false, null, null, null, -39, -40),
  ('INJ-0003', 'W-203', -2, '13:15', -2, '13:20', 'Leah Morgan', 'Packing room', 'Carton knife slipped', 'Laceration', 'Left index finger', 'Small cut, cleaned and dressed by the first aider.', false, 'first-aid', false, null, null, null, null, null),
  ('INJ-0004', 'W-301', -12, '07:50', -12, '08:00', 'Chris Pappas', 'Boning room', 'Hand caught in the bandsaw guard', 'Amputation', 'Tip of the left ring finger', 'Tip of the finger lost at the bandsaw. Taken to Dandenong Hospital by ambulance.', false, 'lost-time', true, null, null, null, null, -12),
  ('INJ-0005', 'W-302', -30, '09:00', -8, '16:00', 'Sarah O''Neill', 'Quality office', 'Work pressure and conflict over audit findings', 'Psychological injury', null, 'Reported anxiety and sleeplessness after months of conflict over audit sign-offs.', true, 'lost-time', false, null, null, null, null, -8),
  ('INJ-0006', 'W-303', -120, '06:15', -120, '06:30', 'Tom Nguyen', 'Truck cab, Clayton delivery', 'Stepping down from the truck cab', 'Ligament tear', 'Right knee', 'Missed the bottom step getting out of the cab and twisted the knee.', false, 'lost-time', false, null, null, null, null, -120),
  ('INJ-0007', 'W-401', -14, '11:05', -14, '11:15', 'Jade Wilson', 'Chiller aisle 4', 'Slipped on a wet floor', 'Fracture', 'Right wrist', 'Slipped on condensation by the chiller door and put a hand out.', false, 'lost-time', false, null, null, null, null, null),
  ('INJ-0008', 'W-402', -20, '05:40', -20, '05:45', 'Ben Walker', 'Wash bay', 'Chemical splash while decanting sanitiser', 'Eye irritation', 'Both eyes', 'Splash to the face, eyes flushed for 15 minutes, seen by a GP the same day.', false, 'medical', false, null, null, null, -18, null),
  ('INJ-0009', 'W-102', -25, '15:30', -25, '15:35', 'Hana Ruru', 'Cool store', 'Foot run over by a pallet jack', 'Crush injury', 'Left ankle', 'Pallet jack rolled over the left foot on the cool store ramp.', false, 'lost-time', false, null, null, null, null, null),
  ('INJ-0010', 'W-103', -11, '10:00', -11, '10:00', 'Aroha Wiremu', 'Packing line 1', 'Repetitive packing over several months', 'Gradual process', 'Right wrist', 'Ache in the wrist that is worse at the end of each shift.', false, 'medical', false, null, null, null, null, null),
  ('INJ-0011', 'W-104', -95, '13:00', -95, '13:05', 'Hana Ruru', 'Workshop', 'Contact with a hot steam line during repair', 'Burn', 'Left forearm', 'Second degree burn to the forearm while isolating a steam line.', false, 'lost-time', false, null, null, null, null, null),
  ('INJ-0012', 'W-101', -18, '08:10', -18, '08:15', 'Hana Ruru', 'Mezzanine stores', 'Fall from a ladder, about 2 metres', 'Fracture', 'Left wrist and hip', 'Fell from the mezzanine access ladder. Wrist fractured, hip bruised. Admitted overnight.', false, 'lost-time', true, -18, '10:40', 'WSNZ-2026-118342', null, null)
) as v(ref, worker, occ_day, occ_time, aware_day, aware_time, reported_by, location, mechanism, nature, body_part, description, mental, severity, notifiable, reg_day, reg_time, reg_ref, ins_day, registered)
join workers w on w.code = v.worker
on conflict (ref) do nothing;

insert into claims (ref, injury_id, claim_number, received_on, weekly, incapacity_from, forwarded_on, authority_notified_on, liability, liability_on, estimate_cents, case_manager, treating_doctor, status, closed_on, closed_reason)
select v.ref, i.id, v.number, current_date + v.received, v.weekly, current_date + v.incap, current_date + v.fwd, current_date + v.auth, v.liability, current_date + v.liab_day,
  v.estimate, v.cm, v.doctor, v.status, current_date + v.closed, v.reason
from (values
  ('CLM-0002', 'INJ-0002', '24A1009372', -39, true, -39, -38, null::int, 'provisional', -35, 1850000, 'Rachel Ho (icare)', 'Dr Amir Haddad', 'open', null::int, null),
  ('CLM-0004', 'INJ-0004', null, -12, true, -12, null, null, 'pending', null, 2400000, null, 'Dr Kate Ellis', 'open', null, null),
  ('CLM-0005', 'INJ-0005', 'VWA-5531902', -6, true, -7, -4, null, 'pending', null, 3500000, 'Mark Steele (agent)', 'Dr Joanna Price', 'open', null, null),
  ('CLM-0006', 'INJ-0006', 'VWA-5498011', -119, true, -119, -115, null, 'accepted', -100, 4200000, 'Mark Steele (agent)', 'Dr Kate Ellis', 'open', null, null),
  ('CLM-0009', 'INJ-0009', 'AEP-26-0091', -24, true, -24, null, null, 'pending', null, 900000, 'Hana Ruru', 'Dr Sione Taufa', 'open', null, null),
  ('CLM-0010', 'INJ-0010', 'AEP-26-0104', -10, false, null, null, null, 'pending', null, 150000, 'Hana Ruru', 'Dr Sione Taufa', 'open', null, null),
  ('CLM-0011', 'INJ-0011', 'AEP-26-0057', -94, true, -94, null, null, 'accepted', -80, 600000, 'Hana Ruru', 'Dr Sione Taufa', 'closed', -30, 'Back at full duties, no further treatment'),
  ('CLM-0012', 'INJ-0012', 'AEP-26-0098', -17, true, -17, null, null, 'accepted', -10, 1600000, 'Hana Ruru', 'Dr Sione Taufa', 'open', null, null)
) as v(ref, injury, number, received, weekly, incap, fwd, auth, liability, liab_day, estimate, cm, doctor, status, closed, reason)
join injuries i on i.ref = v.injury
on conflict (ref) do nothing;

insert into certificates (ref, claim_id, issued_on, from_on, to_on, capacity, hours_per_week, restrictions, doctor)
select v.ref, c.id, current_date + v.issued, current_date + v.f, current_date + v.t, v.capacity, v.hours, v.restrictions, v.doctor
from (values
  ('CC-0001', 'CLM-0002', -39, -39, -26, 'none', null::numeric, null, 'Dr Amir Haddad'),
  ('CC-0002', 'CLM-0002', -25, -25, -2, 'suitable', 20, 'No lifting over 5 kg. No reaching above shoulder height with the right arm.', 'Dr Amir Haddad'),
  ('CC-0003', 'CLM-0004', -12, -12, 2, 'none', null, null, 'Dr Kate Ellis'),
  ('CC-0004', 'CLM-0005', -7, -7, 21, 'none', null, null, 'Dr Joanna Price'),
  ('CC-0005', 'CLM-0006', -119, -119, -91, 'none', null, null, 'Dr Kate Ellis'),
  ('CC-0006', 'CLM-0006', -90, -90, -31, 'suitable', 16, 'Seated duties only. No climbing.', 'Dr Kate Ellis'),
  ('CC-0007', 'CLM-0006', -30, -30, 28, 'suitable', 24, 'No climbing in and out of truck cabs. Yard and dispatch duties only.', 'Dr Kate Ellis'),
  ('CC-0008', 'CLM-0009', -24, -24, 4, 'none', null, null, 'Dr Sione Taufa'),
  ('CC-0009', 'CLM-0011', -94, -94, -60, 'none', null, null, 'Dr Sione Taufa'),
  ('CC-0010', 'CLM-0011', -59, -59, -46, 'suitable', 30, 'Keep the dressing dry. No hot work.', 'Dr Sione Taufa'),
  ('CC-0011', 'CLM-0011', -45, -45, -31, 'full', null, null, 'Dr Sione Taufa'),
  ('CC-0012', 'CLM-0012', -17, -17, 11, 'none', null, null, 'Dr Sione Taufa')
) as v(ref, claim, issued, f, t, capacity, hours, restrictions, doctor)
join claims c on c.ref = v.claim
on conflict (ref) do nothing;

insert into rtw_plans (ref, claim_id, starts_on, review_on, duties, hours_per_week, status, agreed_on, agreed_by, ended_on)
select v.ref, c.id, current_date + v.starts, current_date + v.review, v.duties, v.hours, v.status, current_date + v.agreed, v.agreed_by, current_date + v.ended
from (values
  ('RTW-001', 'CLM-0002', -24, -5, 'Label checking and line paperwork, seated, 4 hours a day, Monday to Friday', 20, 'agreed', -24, 'Priya Nair, Leah Morgan, Dr Amir Haddad', null::int),
  ('RTW-002', 'CLM-0006', -89, -31, 'Dispatch office, seated, 4 hours a day for four days', 16, 'ended', -89, 'Tom Nguyen, Chris Pappas', -31),
  ('RTW-003', 'CLM-0006', -29, 12, 'Yard marshalling and dispatch desk, no cab work, 6 hours a day for four days', 24, 'agreed', -29, 'Tom Nguyen, Chris Pappas, Dr Kate Ellis', null),
  ('RTW-004', 'CLM-0011', -59, -46, 'Workshop parts and planning, no hot work, 6 hours a day', 30, 'ended', -59, 'Liam Chen, Hana Ruru', -45)
) as v(ref, claim, starts, review, duties, hours, status, agreed, agreed_by, ended)
join claims c on c.ref = v.claim
on conflict (ref) do nothing;

insert into payments (ref, claim_id, kind, period_from, period_to, paid_on, payee, amount_cents, reimbursable, reimbursed_on, invoice_ref, note)
select v.ref, c.id, v.kind, current_date + v.pf, current_date + v.pt, current_date + v.paid, v.payee, v.amount, v.reimb, current_date + v.reimbursed, v.inv, v.note
from (values
  ('PAY-0001', 'CLM-0002', 'weekly', -39, -33, -31, 'Priya Nair', 134900, true, -12, null, 'Wages paid through payroll, claimed from icare'),
  ('PAY-0002', 'CLM-0002', 'weekly', -32, -26, -24, 'Priya Nair', 134900, true, null::int, null, 'Wages paid through payroll, claimed from icare'),
  ('PAY-0003', 'CLM-0002', 'weekly', -25, -19, -17, 'Priya Nair', 72000, true, null, null, 'Make-up pay above suitable-duties wages'),
  ('PAY-0004', 'CLM-0002', 'allied', -30, -30, -28, 'Wetherill Park Physiotherapy', 9500, false, null, 'WPP-4471', null),
  ('PAY-0005', 'CLM-0006', 'weekly', -119, -108, -105, 'Tom Nguyen', 210000, false, null, null, 'Employer excess: first 10 days off work'),
  ('PAY-0006', 'CLM-0006', 'weekly', -107, -101, -96, 'Tom Nguyen', 144900, true, -70, null, 'Above the excess, claimed from the agent'),
  ('PAY-0007', 'CLM-0006', 'weekly', -100, -94, -89, 'Tom Nguyen', 144900, true, null, null, 'Above the excess, claimed from the agent'),
  ('PAY-0008', 'CLM-0006', 'medical', -119, -119, -110, 'Dandenong Medical Centre', 18000, false, null, 'DMC-20931', 'Within the medical excess'),
  ('PAY-0009', 'CLM-0011', 'first-week', -94, -88, -87, 'Liam Chen', 111200, false, null, null, 'First week compensation, 80%'),
  ('PAY-0010', 'CLM-0011', 'weekly', -87, -81, -80, 'Liam Chen', 111200, false, null, null, null),
  ('PAY-0011', 'CLM-0012', 'first-week', -17, -11, -10, 'Mere Tane', 94400, false, null, null, 'First week compensation, 80%'),
  ('PAY-0012', 'CLM-0012', 'medical', -17, -17, -9, 'Middlemore Hospital', 42000, false, null, 'MMH-88102', 'Emergency department')
) as v(ref, claim, kind, pf, pt, paid, payee, amount, reimb, reimbursed, inv, note)
join claims c on c.ref = v.claim
on conflict (ref) do nothing;

insert into actions (ref, claim_id, injury_id, what, due_on, done_on, outcome)
select v.ref, c.id, i.id, v.what, current_date + v.due, current_date + v.done, v.outcome
from (values
  ('ACT-001', 'CLM-0006', null, 'Ask Dr Ellis whether cab work can come back at the next review', -3, null::int, null),
  ('ACT-002', 'CLM-0002', null, 'Book a workplace assessment with the rehabilitation provider', 4, null, null),
  ('ACT-003', null, 'INJ-0003', 'Replace the blade guard on the carton knife station', -1, -1, 'New guarded knives issued to the packing room'),
  ('ACT-004', null, 'INJ-0007', 'Fit a drip tray and anti-slip mat at the chiller door', 2, null, null)
) as v(ref, claim, injury, what, due, done, outcome)
left join claims c on c.ref = v.claim
left join injuries i on i.ref = v.injury
on conflict (ref) do nothing;

insert into notes (claim_id, at, kind, who, body, actor)
select c.id, current_date + v.day + time '10:00', v.kind, v.who, v.body, 'Seed'
from (values
  ('CLM-0002', -6, 'call', 'Priya Nair', 'Shoulder improving slowly. Physio twice a week. Happy with the label checking duties.'),
  ('CLM-0004', -11, 'call', 'Marco Russo', 'Home from hospital. Hand surgeon review next week.'),
  ('CLM-0005', -4, 'email', 'Mark Steele (agent)', 'Claim received by the agent. Factual investigation to be arranged.'),
  ('CLM-0006', -25, 'meeting', 'Tom Nguyen, Chris Pappas', 'Plan RTW-003 started. Tom keen to get back on the road.'),
  ('CLM-0009', -20, 'call', 'Daniel Fale', 'X-ray clear of fracture. Swelling still bad. Off work until the next certificate.'),
  ('CLM-0010', -9, 'note', null, 'ACC45 received from the GP. Asked the team leader for the packing rotation history.'),
  ('CLM-0012', -3, 'call', 'Mere Tane', 'Cast on for another four weeks. Asked about light duties from week six.')
) as v(claim, day, kind, who, body)
join claims c on c.ref = v.claim
where not exists (select 1 from notes n where n.claim_id = c.id and n.body = v.body);

insert into activity (actor, action, ref, detail)
select 'Seed', v.action, v.ref, v.detail
from (values
  ('seed', 'AKL', 'Demo sites, workers, injuries and claims loaded'),
  ('report-injury', 'INJ-0001', 'Josh Kelly, back strain, lost time'),
  ('lodge-claim', 'CLM-0005', 'Sarah O''Neill, mental injury claim received')
) as v(action, ref, detail)
where not exists (select 1 from activity);
