-- ==============================================================================
-- EOD MONITORING MATRIX — DEFENSE-IN-DEPTH SUPABASE DATABASE SCHEMA & RLS
-- Migration: 20260924000000_secure_eod_monitoring_schema.sql
-- Target: Supabase / PostgreSQL 15+
-- ==============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Role Definition:
-- Super Admin: Full platform governance, security policies, hard delete
-- Admin: Operational administration, user assignment, restore audit
-- Auditor: Cross-branch read-only audit access
-- RM (Regional Manager): Multi-branch regional oversight based on branch.region
-- FM (Field Manager): Cluster/Field operational oversight across assigned branches
-- Branch Manager: Full read/write management limited strictly to own branch
-- Staff: Submission and own-record management limited strictly to own branch
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'Super Admin',
    'Admin',
    'Auditor',
    'RM',
    'FM',
    'Branch Manager',
    'Staff'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.variance_status AS ENUM ('G', 'Y', 'R', 'C');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.priority_level AS ENUM ('Critical', 'High', 'Medium', 'Low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.action_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. CORE MASTER TABLES

-- Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  region VARCHAR(64) NOT NULL DEFAULT 'Central',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  role public.app_role NOT NULL DEFAULT 'Staff',
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  assigned_region VARCHAR(64), -- For RM regional matching
  phone VARCHAR(32),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product Items Catalog
CREATE TABLE IF NOT EXISTS public.product_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(10) NOT NULL DEFAULT 'FG' CHECK (category IN ('FG', 'RM')),
  default_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (default_price >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EOD Records Table (Core Transactions)
CREATE TABLE IF NOT EXISTS public.eod_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_type VARCHAR(64) NOT NULL,
  variance_status public.variance_status NOT NULL DEFAULT 'Y',
  department VARCHAR(16) NOT NULL DEFAULT 'FG' CHECK (department IN ('FG', 'RM', 'General')),
  total_financial_impact NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_financial_impact >= 0),
  root_cause VARCHAR(64) NOT NULL DEFAULT 'Staff Error',
  root_cause_other TEXT,
  remarks TEXT,
  evidence_photo_url TEXT,
  voided BOOLEAN NOT NULL DEFAULT false,
  voided_by UUID REFERENCES public.profiles(id),
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EOD Line Items
CREATE TABLE IF NOT EXISTS public.eod_record_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eod_record_id UUID NOT NULL REFERENCES public.eod_records(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.product_items(id) ON DELETE SET NULL,
  item_name VARCHAR(128) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (quantity >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
  total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incident Reports Table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  eod_record_id UUID REFERENCES public.eod_records(id) ON DELETE SET NULL,
  title VARCHAR(160) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'High' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  description TEXT NOT NULL,
  evidence_attachment_path TEXT,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Closed')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action Tracker Table (Remediation Tasks)
CREATE TABLE IF NOT EXISTS public.action_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  eod_record_id UUID REFERENCES public.eod_records(id) ON DELETE SET NULL,
  title VARCHAR(160) NOT NULL,
  directive TEXT,
  priority public.priority_level NOT NULL DEFAULT 'Medium',
  status public.action_status NOT NULL DEFAULT 'Open',
  due_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  target_staff UUID REFERENCES public.profiles(id),
  target_staff_name VARCHAR(128),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Watchlist Table (High-Risk Tagging)
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('Branch', 'Staff', 'Product')),
  entity_id VARCHAR(64) NOT NULL,
  entity_name VARCHAR(128) NOT NULL,
  risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  flag_reason TEXT NOT NULL,
  flagged_by UUID NOT NULL REFERENCES public.profiles(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily Sales Reconciliation Table
CREATE TABLE IF NOT EXISTS public.daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pos_gross_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  pos_net_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  actual_cash_collected NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  cash_variance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reconciled', 'Discrepancy')),
  verified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_branch_daily_sales UNIQUE (branch_id, date)
);

-- Audit Logs Table (Immutable append-only ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(64) NOT NULL,
  record_id UUID,
  operation VARCHAR(16) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'VOID')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_ip VARCHAR(45),
  user_agent TEXT
);

-- 3. INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_eod_records_branch_date ON public.eod_records(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_eod_records_submitted ON public.eod_records(submitted_by);
CREATE INDEX IF NOT EXISTS idx_eod_items_eod_id ON public.eod_record_items(eod_record_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_branch ON public.incident_reports(branch_id);
CREATE INDEX IF NOT EXISTS idx_action_tracker_branch_status ON public.action_tracker(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(changed_at DESC);

-- 4. SECURITY DEFINER HELPER FUNCTIONS
-- Securely retrieves the active user's role without trusting client claims
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Securely retrieves the active user's assigned branch
CREATE OR REPLACE FUNCTION public.current_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Securely retrieves the active user's assigned region (for RM)
CREATE OR REPLACE FUNCTION public.current_user_region()
RETURNS VARCHAR AS $$
  SELECT assigned_region FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Check if active user has cross-branch read permissions (Super Admin, Admin, Auditor)
CREATE OR REPLACE FUNCTION public.has_cross_branch_access()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('Super Admin', 'Admin', 'Auditor');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. GRANT HYGIENE: REVOKE ALL DEFAULTS & RE-GRANT LEAST PRIVILEGES
-- Supabase default grants are wide open. We systematically close them:
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;', tbl);
  END LOOP;
END $$;

-- Enable Row Level Security on EVERY table
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_record_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant selective privileges to authenticated users (RLS strictly controls row access)
GRANT SELECT ON public.branches TO authenticated;
GRANT INSERT, UPDATE ON public.branches TO authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.product_items TO authenticated;
GRANT INSERT, UPDATE ON public.product_items TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.eod_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eod_record_items TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.incident_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.action_tracker TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.watchlist TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_sales TO authenticated;

-- Audit logs are strictly read-only for auditors/admins; writes happen solely via triggers
GRANT SELECT ON public.audit_logs TO authenticated;

-- 6. ROW LEVEL SECURITY POLICIES

-- ==============================================================================
-- 6.1 PROFILES POLICIES
-- ==============================================================================
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_cross_branch_access()
    OR id = auth.uid()
    OR branch_id = public.current_user_branch_id()
    OR (public.current_user_role() = 'RM' AND assigned_region = (SELECT region FROM public.branches WHERE id = profiles.branch_id))
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() IN ('Super Admin', 'Admin')
  )
  WITH CHECK (
    -- Normal users cannot elevate their own role or switch their branch
    (id = auth.uid() AND role = public.current_user_role() AND branch_id = public.current_user_branch_id())
    OR public.current_user_role() IN ('Super Admin', 'Admin')
  );

-- ==============================================================================
-- 6.2 BRANCHES POLICIES
-- ==============================================================================
CREATE POLICY "branches_select_policy"
  ON public.branches FOR SELECT
  TO authenticated
  USING (
    public.has_cross_branch_access()
    OR id = public.current_user_branch_id()
    OR (public.current_user_role() = 'RM' AND region = public.current_user_region())
  );

CREATE POLICY "branches_modify_admin_only"
  ON public.branches FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_user_role() IN ('Super Admin', 'Admin'));

-- ==============================================================================
-- 6.3 PRODUCT ITEMS POLICIES
-- ==============================================================================
CREATE POLICY "product_items_select"
  ON public.product_items FOR SELECT
  TO authenticated
  USING (true); -- Catalog is readable across all company branches

CREATE POLICY "product_items_modify"
  ON public.product_items FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_user_role() IN ('Super Admin', 'Admin'));

-- ==============================================================================
-- 6.4 EOD_RECORDS POLICIES (BRANCH-ISOLATED)
-- ==============================================================================
CREATE POLICY "eod_records_select_isolated"
  ON public.eod_records FOR SELECT
  TO authenticated
  USING (
    public.has_cross_branch_access()
    OR (
      branch_id = public.current_user_branch_id()
      AND (
        public.current_user_role() IN ('Branch Manager', 'FM')
        OR (public.current_user_role() = 'Staff' AND (submitted_by = auth.uid() OR NOT voided))
      )
    )
    OR (
      public.current_user_role() = 'RM'
      AND branch_id IN (SELECT id FROM public.branches WHERE region = public.current_user_region())
    )
  );

CREATE POLICY "eod_records_insert_branch_match"
  ON public.eod_records FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND (
      -- Must insert into user's own assigned branch
      branch_id = public.current_user_branch_id()
      OR public.current_user_role() IN ('Super Admin', 'Admin')
    )
    AND public.current_user_role() != 'Auditor' -- Auditor is strictly read-only
  );

CREATE POLICY "eod_records_update_branch_match"
  ON public.eod_records FOR UPDATE
  TO authenticated
  USING (
    NOT voided
    AND (
      public.current_user_role() IN ('Super Admin', 'Admin')
      OR (
        branch_id = public.current_user_branch_id()
        AND (
          public.current_user_role() = 'Branch Manager'
          OR (public.current_user_role() = 'Staff' AND submitted_by = auth.uid() AND date = CURRENT_DATE)
        )
      )
    )
  )
  WITH CHECK (
    -- Prevent changing branch_id or author to spoof records
    branch_id = (SELECT branch_id FROM public.eod_records WHERE id = eod_records.id)
    AND submitted_by = (SELECT submitted_by FROM public.eod_records WHERE id = eod_records.id)
  );

-- Hard deletes are strictly denied for authenticated role. Only Super Admin via service_role.
CREATE POLICY "eod_records_delete_super_admin_only"
  ON public.eod_records FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'Super Admin');

-- ==============================================================================
-- 6.5 EOD RECORD ITEMS POLICIES
-- ==============================================================================
CREATE POLICY "eod_items_select"
  ON public.eod_record_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.eod_records r
      WHERE r.id = eod_record_items.eod_record_id
    )
  );

CREATE POLICY "eod_items_insert"
  ON public.eod_record_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eod_records r
      WHERE r.id = eod_record_items.eod_record_id
      AND (
        r.branch_id = public.current_user_branch_id()
        OR public.current_user_role() IN ('Super Admin', 'Admin')
      )
    )
  );

-- ==============================================================================
-- 6.6 INCIDENT REPORTS POLICIES
-- ==============================================================================
CREATE POLICY "incidents_select_isolated"
  ON public.incident_reports FOR SELECT
  TO authenticated
  USING (
    public.has_cross_branch_access()
    OR branch_id = public.current_user_branch_id()
    OR (public.current_user_role() = 'RM' AND branch_id IN (SELECT id FROM public.branches WHERE region = public.current_user_region()))
  );

CREATE POLICY "incidents_insert_branch_match"
  ON public.incident_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reported_by = auth.uid()
    AND (
      branch_id = public.current_user_branch_id()
      OR public.current_user_role() IN ('Super Admin', 'Admin')
    )
    AND public.current_user_role() NOT IN ('Auditor', 'Staff') -- Staff cannot file unsupervised incidents
  );

CREATE POLICY "incidents_update"
  ON public.incident_reports FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('Super Admin', 'Admin', 'Branch Manager', 'FM')
    AND (
      public.current_user_role() IN ('Super Admin', 'Admin')
      OR branch_id = public.current_user_branch_id()
    )
  );

-- ==============================================================================
-- 6.7 ACTION TRACKER POLICIES
-- ==============================================================================
CREATE POLICY "action_tracker_select_isolated"
  ON public.action_tracker FOR SELECT
  TO authenticated
  USING (
    public.has_cross_branch_access()
    OR branch_id = public.current_user_branch_id()
    OR (public.current_user_role() = 'RM' AND branch_id IN (SELECT id FROM public.branches WHERE region = public.current_user_region()))
  );

CREATE POLICY "action_tracker_insert"
  ON public.action_tracker FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('Super Admin', 'Admin', 'Branch Manager', 'FM')
    AND (
      public.current_user_role() IN ('Super Admin', 'Admin')
      OR branch_id = public.current_user_branch_id()
    )
  );

CREATE POLICY "action_tracker_update"
  ON public.action_tracker FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('Super Admin', 'Admin', 'Branch Manager', 'FM')
    OR (target_staff = auth.uid()) -- Assigned staff can update progress notes
  );

-- ==============================================================================
-- 6.8 WATCHLIST POLICIES
-- ==============================================================================
CREATE POLICY "watchlist_select"
  ON public.watchlist FOR SELECT
  TO authenticated
  USING (
    public.has_cross_branch_access()
    OR public.current_user_role() IN ('Branch Manager', 'FM')
  );

CREATE POLICY "watchlist_modify"
  ON public.watchlist FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('Super Admin', 'Admin', 'Auditor'))
  WITH CHECK (public.current_user_role() IN ('Super Admin', 'Admin', 'Auditor'));

-- ==============================================================================
-- 6.9 DAILY SALES POLICIES
-- ==============================================================================
CREATE POLICY "daily_sales_select"
  ON public.daily_sales FOR SELECT
  TO authenticated
  USING (
    public.has_cross_branch_access()
    OR branch_id = public.current_user_branch_id()
    OR (public.current_user_role() = 'RM' AND branch_id IN (SELECT id FROM public.branches WHERE region = public.current_user_region()))
  );

CREATE POLICY "daily_sales_insert_update"
  ON public.daily_sales FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('Super Admin', 'Admin', 'Branch Manager')
    AND (
      public.current_user_role() IN ('Super Admin', 'Admin')
      OR branch_id = public.current_user_branch_id()
    )
  );

-- ==============================================================================
-- 6.10 AUDIT LOGS POLICIES (IMMUTABLE)
-- ==============================================================================
CREATE POLICY "audit_logs_read_only"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('Super Admin', 'Admin', 'Auditor'));

-- No direct INSERT/UPDATE/DELETE allowed from client. Handled strictly by database triggers.

-- 7. AUDIT LOGGING & SOFT-DELETE TRIGGERS

-- Generic trigger function to log all modifications
CREATE OR REPLACE FUNCTION public.trg_fn_audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_record_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_record_id := OLD.id;
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), auth.uid(), now());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_record_id := NEW.id;
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, new_data, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), now());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    v_record_id := NEW.id;
    INSERT INTO public.audit_logs (table_name, record_id, operation, new_data, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', to_jsonb(NEW), auth.uid(), now());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach audit trigger to critical tables
DROP TRIGGER IF EXISTS trg_audit_eod_records ON public.eod_records;
CREATE TRIGGER trg_audit_eod_records
  AFTER INSERT OR UPDATE OR DELETE ON public.eod_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_incident_reports ON public.incident_reports;
CREATE TRIGGER trg_audit_incident_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_action_tracker ON public.action_tracker;
CREATE TRIGGER trg_audit_action_tracker
  AFTER INSERT OR UPDATE OR DELETE ON public.action_tracker
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_audit_log_changes();

-- Soft Delete Enforcement Trigger for EOD Records
CREATE OR REPLACE FUNCTION public.trg_fn_enforce_eod_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent hard DELETE if user is not Super Admin
  IF (public.current_user_role() != 'Super Admin') THEN
    RAISE EXCEPTION 'Physical deletion of EOD records is prohibited by audit policy. Use voiding status instead.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_eod ON public.eod_records;
CREATE TRIGGER trg_prevent_hard_delete_eod
  BEFORE DELETE ON public.eod_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_enforce_eod_soft_delete();

-- 8. STORAGE BUCKETS & STORAGE ROW LEVEL SECURITY
-- Configures private buckets for evidence photos and audit documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('incident-files', 'incident-files', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('eod-evidence', 'eod-evidence', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- File upload policy: must upload into user's own branch folder or user id folder
CREATE POLICY "storage_upload_branch_isolated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('incident-files', 'eod-evidence')
    AND (
      public.has_cross_branch_access()
      OR (storage.foldername(name))[1] = public.current_user_branch_id()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- File read policy: users can only read objects in their branch folder or cross-branch for admins
CREATE POLICY "storage_read_branch_isolated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('incident-files', 'eod-evidence')
    AND (
      public.has_cross_branch_access()
      OR (storage.foldername(name))[1] = public.current_user_branch_id()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Delete policy: only Super Admin and Admin can delete attachments
CREATE POLICY "storage_delete_admin_only"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('incident-files', 'eod-evidence')
    AND public.current_user_role() IN ('Super Admin', 'Admin')
  );

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
