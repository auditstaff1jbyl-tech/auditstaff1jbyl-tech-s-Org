// ==============================================================================
// EOD MONITORING MATRIX — SUPABASE TYPESCRIPT DEFINITIONS
// Path: /src/types/supabase.ts
// ==============================================================================

export type AppRole =
  | 'Super Admin'
  | 'Admin'
  | 'Auditor'
  | 'RM'
  | 'FM'
  | 'Branch Manager'
  | 'Staff';

export type VarianceStatusCode = 'G' | 'Y' | 'R' | 'C';
export type PriorityLevelCode = 'Critical' | 'High' | 'Medium' | 'Low';
export type ActionStatusCode = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface Database {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          code: string;
          name: string;
          region: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          region?: string;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: AppRole;
          branch_id: string | null;
          assigned_region: string | null;
          phone: string | null;
          status: 'Active' | 'Inactive' | 'Suspended';
          mfa_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: AppRole;
          branch_id?: string | null;
          assigned_region?: string | null;
          phone?: string | null;
          status?: 'Active' | 'Inactive' | 'Suspended';
          mfa_enabled?: boolean;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      eod_records: {
        Row: {
          id: string;
          branch_id: string;
          submitted_by: string;
          date: string;
          issue_type: string;
          variance_status: VarianceStatusCode;
          department: 'FG' | 'RM' | 'General';
          total_financial_impact: number;
          root_cause: string;
          root_cause_other: string | null;
          remarks: string | null;
          evidence_photo_url: string | null;
          voided: boolean;
          voided_by: string | null;
          voided_at: string | null;
          void_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          submitted_by: string;
          date?: string;
          issue_type: string;
          variance_status?: VarianceStatusCode;
          department?: 'FG' | 'RM' | 'General';
          total_financial_impact?: number;
          root_cause?: string;
          root_cause_other?: string | null;
          remarks?: string | null;
          evidence_photo_url?: string | null;
          voided?: boolean;
        };
        Update: Partial<Database['public']['Tables']['eod_records']['Insert']>;
      };
      incident_reports: {
        Row: {
          id: string;
          branch_id: string;
          eod_record_id: string | null;
          title: string;
          severity: 'Critical' | 'High' | 'Medium' | 'Low';
          description: string;
          evidence_attachment_path: string | null;
          reported_by: string;
          status: 'Open' | 'Under Review' | 'Closed';
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          eod_record_id?: string | null;
          title: string;
          severity?: 'Critical' | 'High' | 'Medium' | 'Low';
          description: string;
          evidence_attachment_path?: string | null;
          reported_by: string;
          status?: 'Open' | 'Under Review' | 'Closed';
          assigned_to?: string | null;
        };
        Update: Partial<Database['public']['Tables']['incident_reports']['Insert']>;
      };
      action_tracker: {
        Row: {
          id: string;
          branch_id: string;
          eod_record_id: string | null;
          title: string;
          directive: string | null;
          priority: PriorityLevelCode;
          status: ActionStatusCode;
          due_date: string | null;
          assigned_to: string | null;
          target_staff: string | null;
          target_staff_name: string | null;
          resolution_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          eod_record_id?: string | null;
          title: string;
          directive?: string | null;
          priority?: PriorityLevelCode;
          status?: ActionStatusCode;
          due_date?: string | null;
          assigned_to?: string | null;
          target_staff?: string | null;
          target_staff_name?: string | null;
          resolution_notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['action_tracker']['Insert']>;
      };
      watchlist: {
        Row: {
          id: string;
          branch_id: string;
          entity_type: 'Branch' | 'Staff' | 'Product';
          entity_id: string;
          entity_name: string;
          risk_score: number;
          flag_reason: string;
          flagged_by: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          entity_type: 'Branch' | 'Staff' | 'Product';
          entity_id: string;
          entity_name: string;
          risk_score?: number;
          flag_reason: string;
          flagged_by: string;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['watchlist']['Insert']>;
      };
      daily_sales: {
        Row: {
          id: string;
          branch_id: string;
          date: string;
          pos_gross_sales: number;
          pos_net_sales: number;
          actual_cash_collected: number;
          cash_variance: number;
          status: 'Pending' | 'Reconciled' | 'Discrepancy';
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          date?: string;
          pos_gross_sales?: number;
          pos_net_sales?: number;
          actual_cash_collected?: number;
          cash_variance?: number;
          status?: 'Pending' | 'Reconciled' | 'Discrepancy';
          verified_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['daily_sales']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string | null;
          operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'VOID';
          old_data: Record<string, any> | null;
          new_data: Record<string, any> | null;
          changed_by: string | null;
          changed_at: string;
          client_ip: string | null;
          user_agent: string | null;
        };
        Insert: never; // Read-only from API, inserted exclusively via DB triggers
        Update: never;
      };
    };
  };
}
