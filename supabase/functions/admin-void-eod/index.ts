// ==============================================================================
// EOD MONITORING MATRIX — SUPABASE EDGE FUNCTION (PRIVILEGED SERVER-SIDE ACTION)
// Path: /supabase/functions/admin-void-eod/index.ts
// Handles safe administrative voiding with audit reason using service_role client
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate calling user using their JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client scoped to the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Query user profile role using service_role to prevent client spoofing
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role, branch_id, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only Super Admin or Admin can execute historical voiding
    if (!["Super Admin", "Admin"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super Admin or Admin authorization required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse and validate payload
    const { recordId, voidReason } = await req.json();
    if (!recordId || !voidReason?.trim()) {
      return new Response(
        JSON.stringify({ error: "recordId and voidReason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Perform atomic soft-void and write audit entry
    const { data: updatedRecord, error: updateError } = await adminClient
      .from("eod_records")
      .update({
        voided: true,
        voided_by: profile.id,
        voided_at: new Date().toISOString(),
        void_reason: voidReason.trim(),
      })
      .eq("id", recordId)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Explicit audit log record
    await adminClient.from("audit_logs").insert({
      table_name: "eod_records",
      record_id: recordId,
      operation: "VOID",
      changed_by: profile.id,
      new_data: { void_reason: voidReason, voided_by_name: profile.full_name },
      client_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Record successfully voided and logged in audit ledger",
        record: updatedRecord,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
