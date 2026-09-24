-- ==============================================================================
-- EOD MONITORING MATRIX — SUPABASE RLS AUTOMATED SECURITY TEST SUITE (pgTAP)
-- Test file: /supabase/tests/eod_security_rls.test.sql
-- Run with: supabase test db
-- ==============================================================================

BEGIN;
SELECT plan(22);

-- 1. Verify RLS is enabled on all critical tables
SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'eod_records'),
  'RLS should be ENABLED on public.eod_records'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
  'RLS should be ENABLED on public.profiles'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'branches'),
  'RLS should be ENABLED on public.branches'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'incident_reports'),
  'RLS should be ENABLED on public.incident_reports'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs'),
  'RLS should be ENABLED on public.audit_logs'
);

-- 2. Test Setup: Seed test branches & test users
DO $$
DECLARE
  b1 UUID := '11111111-1111-1111-1111-111111111111'::UUID;
  b2 UUID := '22222222-2222-2222-2222-222222222222'::UUID;
  u_staff1 UUID := '33333333-3333-3333-3333-333333333333'::UUID;
  u_staff2 UUID := '44444444-4444-4444-4444-444444444444'::UUID;
  u_auditor UUID := '55555555-5555-5555-5555-555555555555'::UUID;
  u_admin UUID := '66666666-6666-6666-6666-666666666666'::UUID;
BEGIN
  -- Insert dummy branches
  INSERT INTO public.branches (id, code, name, region)
  VALUES 
    (b1, 'BR-MANILA', 'Manila Branch', 'NCR'),
    (b2, 'BR-CEBU', 'Cebu Branch', 'Visayas')
  ON CONFLICT (id) DO NOTHING;

  -- Insert dummy profiles (simulating auth.users)
  INSERT INTO public.profiles (id, email, full_name, role, branch_id)
  VALUES 
    (u_staff1, 'staff1@company.com', 'Staff Manila', 'Staff', b1),
    (u_staff2, 'staff2@company.com', 'Staff Cebu', 'Staff', b2),
    (u_auditor, 'auditor@company.com', 'Head Auditor', 'Auditor', NULL),
    (u_admin, 'admin@company.com', 'Super Admin', 'Super Admin', NULL)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id;

  -- Insert test record into Branch Manila
  INSERT INTO public.eod_records (id, branch_id, submitted_by, date, issue_type, variance_status, total_financial_impact)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, b1, u_staff1, CURRENT_DATE, 'Wrong EOD', 'R', 1500.00)
  ON CONFLICT DO NOTHING;
END $$;

-- 3. TEST: Anonymous (anon) access is completely blocked
SET ROLE anon;

SELECT throws_ok(
  'SELECT * FROM public.eod_records;',
  42501, -- permission denied
  'Anonymous role cannot SELECT from eod_records'
);

SELECT throws_ok(
  'INSERT INTO public.eod_records(branch_id, submitted_by, issue_type) VALUES (''11111111-1111-1111-1111-111111111111'', ''33333333-3333-3333-3333-333333333333'', ''Test'');',
  42501,
  'Anonymous role cannot INSERT into eod_records'
);

SELECT throws_ok(
  'SELECT * FROM public.audit_logs;',
  42501,
  'Anonymous role cannot SELECT from audit_logs'
);

-- 4. TEST: Authenticated Staff 2 (Cebu) cannot read Manila Branch EOD records
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);

SELECT is_empty(
  'SELECT id FROM public.eod_records WHERE branch_id = ''11111111-1111-1111-1111-111111111111'';',
  'Staff from Cebu Branch must see 0 rows from Manila Branch'
);

-- 5. TEST: Authenticated Staff 2 (Cebu) cannot insert a record claiming to be from Manila Branch
SELECT throws_ok(
  'INSERT INTO public.eod_records (branch_id, submitted_by, date, issue_type, variance_status) VALUES (''11111111-1111-1111-1111-111111111111'', ''44444444-4444-4444-4444-444444444444'', CURRENT_DATE, ''Tamper Test'', ''Y'');',
  '42501',
  'Staff cannot INSERT a record for another branch (violates with check policy)'
);

-- 6. TEST: Authenticated Staff 1 (Manila) CAN read their own branch record
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

SELECT isnt_empty(
  'SELECT id FROM public.eod_records WHERE branch_id = ''11111111-1111-1111-1111-111111111111'';',
  'Staff from Manila Branch can read their own branch records'
);

-- 7. TEST: Staff attempting to elevate their own role in public.profiles is BLOCKED
SELECT throws_ok(
  'UPDATE public.profiles SET role = ''Super Admin'' WHERE id = ''33333333-3333-3333-3333-333333333333'';',
  '42501',
  'Staff cannot escalate their own role to Super Admin'
);

-- 8. TEST: Staff attempting to change branch_id on an existing EOD record is BLOCKED
SELECT throws_ok(
  'UPDATE public.eod_records SET branch_id = ''22222222-2222-2222-2222-222222222222'' WHERE id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'';',
  '42501',
  'Staff cannot switch branch_id on existing records'
);

-- 9. TEST: Staff attempting to physically DELETE an EOD record is BLOCKED by trigger & policy
SELECT throws_ok(
  'DELETE FROM public.eod_records WHERE id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'';',
  'P0001',
  'Non-Super Admin hard delete is rejected by soft-delete audit trigger'
);

-- 10. TEST: Auditor has cross-branch SELECT access
SELECT set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

SELECT isnt_empty(
  'SELECT id FROM public.eod_records WHERE branch_id = ''11111111-1111-1111-1111-111111111111'';',
  'Auditor can read Manila Branch records'
);

-- 11. TEST: Auditor is strictly READ-ONLY (Cannot INSERT or UPDATE EOD records)
SELECT throws_ok(
  'INSERT INTO public.eod_records (branch_id, submitted_by, date, issue_type, variance_status) VALUES (''11111111-1111-1111-1111-111111111111'', ''55555555-5555-5555-5555-555555555555'', CURRENT_DATE, ''Auditor Insert'', ''Y'');',
  '42501',
  'Auditor role cannot insert EOD records'
);

SELECT throws_ok(
  'UPDATE public.eod_records SET total_financial_impact = 9999 WHERE id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'';',
  '42501',
  'Auditor role cannot update EOD records'
);

-- 12. TEST: Audit trail trigger recorded the previous insert
SELECT set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true); -- Super Admin

SELECT isnt_empty(
  'SELECT id FROM public.audit_logs WHERE table_name = ''eod_records'';',
  'Audit log contains automated change records created by triggers'
);

-- 13. TEST: Audit logs table cannot be deleted from or updated directly by clients
SELECT throws_ok(
  'DELETE FROM public.audit_logs;',
  '42501',
  'Direct client deletion from audit_logs table is strictly denied'
);

SELECT * FROM finish();
ROLLBACK;
