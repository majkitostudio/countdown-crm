begin;

select plan(18);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('51111111-1111-4111-8111-111111111111', 'review-tl-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Review TL A"}'::jsonb),
  ('52222222-2222-4222-8222-222222222222', 'review-admin-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Review Admin A"}'::jsonb),
  ('53333333-3333-4333-8333-333333333333', 'review-operator-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Review Operator A"}'::jsonb),
  ('54444444-4444-4444-8444-444444444444', 'review-tl-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Review TL B"}'::jsonb);

insert into public.organizations (id, name, slug)
values
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Review Organization A', 'review-org-a'),
  ('5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Review Organization B', 'review-org-b');

insert into public.workspaces (id, organization_id, name, slug)
values
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Review Workspace A', 'review-workspace-a'),
  ('5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Review Workspace B', 'review-workspace-b');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '51111111-1111-4111-8111-111111111111', 'team_leader'),
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '52222222-2222-4222-8222-222222222222', 'administrator'),
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '53333333-3333-4333-8333-333333333333', 'operator'),
  ('5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '54444444-4444-4444-8444-444444444444', 'team_leader');

insert into public.leads (id, workspace_id, full_name, phone)
values
  ('57777777-7777-4777-8777-777777777777', '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Review Lead A', '+420700000011'),
  ('58888888-8888-4888-8888-888888888888', '5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', 'Review Lead B', '+420700000012');

insert into public.calls (id, workspace_id, lead_id, agent_id, duration_seconds, outcome, transcript)
values
  ('5c111111-1111-4111-8111-111111111111', '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '57777777-7777-4777-8777-777777777777', '53333333-3333-4333-8333-333333333333', 90, 'completed', 'Operátor: Dobrý den'),
  ('5c222222-2222-4222-8222-222222222222', '5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '58888888-8888-4888-8888-888888888888', '54444444-4444-4444-8444-444444444444', 60, 'completed', null);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"51111111-1111-4111-8111-111111111111"}', true);

select is(
  (select revision_number from public.record_call_review_revision(
    '5c111111-1111-4111-8111-111111111111',
    0,
    'Hovor splnil očekávání',
    'Operátor správně ověřil adresu.',
    null
  )),
  1,
  'Team Leader creates revision 1 in own workspace'
);

select is(
  (select reviewer_id from public.call_review_revisions where call_id = '5c111111-1111-4111-8111-111111111111'),
  '51111111-1111-4111-8111-111111111111'::uuid,
  'database derives the reviewer from auth uid'
);

select is(
  (select workspace_id from public.call_review_revisions where call_id = '5c111111-1111-4111-8111-111111111111'),
  '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'::uuid,
  'database derives the workspace from the call'
);

select is(
  (select count(*)::integer from public.audit_logs where action = 'CALL_REVIEW_COMPLETED'),
  1,
  'first review creates one completion audit event'
);

select is(
  (select (details::jsonb -> 'previous') from public.audit_logs where action = 'CALL_REVIEW_COMPLETED'),
  '{}'::jsonb,
  'first audit event contains no fabricated previous review'
);

select is(
  (select details::jsonb -> 'new' ->> 'coaching_note' from public.audit_logs where action = 'CALL_REVIEW_COMPLETED'),
  'Operátor správně ověřil adresu.',
  'first audit event contains the exact new coaching text'
);

select is(
  (select revision_number from public.record_call_review_revision(
    '5c111111-1111-4111-8111-111111111111',
    1,
    'Hovor potřebuje opravu',
    'Chybělo závěrečné shrnutí objednávky.',
    'Upřesnění po druhé kontrole'
  )),
  2,
  'correction appends revision 2'
);

select is(
  (select count(*)::integer from public.call_review_revisions where call_id = '5c111111-1111-4111-8111-111111111111'),
  2,
  'both review revisions remain stored'
);

select is(
  (select current_revision.supersedes_revision_id = previous.id
   from public.call_review_revisions current_revision
   join public.call_review_revisions previous
     on previous.call_id = current_revision.call_id
    and previous.revision_number = 1
   where current_revision.revision_number = 2),
  true,
  'correction points to the immediate previous revision'
);

select is(
  (select details::jsonb -> 'previous' ->> 'verdict' from public.audit_logs where action = 'CALL_REVIEW_CORRECTED'),
  'Hovor splnil očekávání',
  'correction audit contains the exact previous verdict'
);

select is(
  (select details::jsonb -> 'new' ->> 'verdict' from public.audit_logs where action = 'CALL_REVIEW_CORRECTED'),
  'Hovor potřebuje opravu',
  'correction audit contains the exact new verdict'
);

select throws_ok(
  $$select * from public.record_call_review_revision(
    '5c111111-1111-4111-8111-111111111111', 1, 'Zastaralý formulář', 'Toto se nesmí uložit.', 'Pozdní oprava'
  )$$,
  'P0001',
  'Review has changed; reload and try again',
  'stale expected revision is rejected'
);

select throws_ok(
  $$select * from public.record_call_review_revision(
    '5c111111-1111-4111-8111-111111111111', 2, 'Bez důvodu', 'Oprava bez důvodu nesmí projít.', null
  )$$,
  'P0001',
  'Correction reason must be between 3 and 1,000 characters',
  'correction requires a reason'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"53333333-3333-4333-8333-333333333333"}', true);

select is(
  (select count(*)::integer from public.call_review_revisions),
  0,
  'operator cannot read review revisions'
);

select throws_ok(
  $$select * from public.record_call_review_revision(
    '5c111111-1111-4111-8111-111111111111', 2, 'Operátor', 'Operátor nesmí hodnotit.', 'Zakázaný pokus'
  )$$,
  'P0001',
  'Team Leader or Administrator access is required',
  'operator cannot create a review revision'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"54444444-4444-4444-8444-444444444444"}', true);

select throws_ok(
  $$select * from public.record_call_review_revision(
    '5c111111-1111-4111-8111-111111111111', 2, 'Cizí workspace', 'Cizí vedoucí nesmí hodnotit.', 'Zakázaný pokus'
  )$$,
  'P0001',
  'Team Leader or Administrator access is required',
  'Team Leader cannot review another workspace'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"52222222-2222-4222-8222-222222222222"}', true);

select is(
  (select revision_number from public.record_call_review_revision(
    '5c111111-1111-4111-8111-111111111111',
    2,
    'Administrátorská oprava',
    'Administrátor doplnil přesnější coaching.',
    'Kontrola administrátorem'
  )),
  3,
  'administrator can append a correction in own workspace'
);

select is(
  (select count(*)::integer from public.call_review_revisions where call_id = '5c111111-1111-4111-8111-111111111111'),
  3,
  'administrator correction preserves prior history'
);

select * from finish();

rollback;
