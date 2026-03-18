import { createClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Service role client for server-side privileged operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Workspace helpers ────────────────────────────────────────────────────────

export async function getOrCreateWorkspace(clerkUserId: string) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  // Use service role to bypass RLS for workspace creation
  const { data: created, error: createErr } = await supabaseAdmin
    .from("workspaces")
    .insert({ clerk_user_id: clerkUserId })
    .select()
    .single();
  if (createErr) throw createErr;
  return created;
}

export async function getAllWorkspacesWithGoogleAds() {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*, integrations_google_ads(*)")
    .eq("integrations_google_ads.status", "active");
  if (error) throw error;
  return data ?? [];
}

// ─── Google Ads integration helpers ──────────────────────────────────────────

export async function upsertGoogleAdsIntegration(
  workspaceId: string,
  customerId: string,
  refreshTokenEnc: string,
  scopes: string
) {
  // Use service role to bypass RLS for integration upsert
  const { error } = await supabaseAdmin.from("integrations_google_ads").upsert(
    {
      workspace_id: workspaceId,
      google_ads_customer_id: customerId,
      refresh_token_enc: refreshTokenEnc,
      scopes,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );
  if (error) throw error;
}

export async function getGoogleAdsIntegration(workspaceId: string) {
  const { data, error } = await supabase
    .from("integrations_google_ads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function revokeGoogleAdsIntegration(workspaceId: string) {
  const { error } = await supabase
    .from("integrations_google_ads")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId);
  if (error) throw error;
}

// ─── Metrics helpers ──────────────────────────────────────────────────────────

export async function upsertDailyMetrics(row: {
  workspace_id: string;
  customer_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  winners_json: object[];
  losers_json: object[];
}) {
  const { error } = await supabase.from("daily_metrics").upsert(row, {
    onConflict: "workspace_id,customer_id,date",
  });
  if (error) throw error;
}

export async function getRecentMetrics(workspaceId: string, limit = 14) {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Campaign Metrics helpers ─────────────────────────────────────────────────

export interface CampaignMetrics {
  workspace_id: string;
  customer_id: string;
  campaign_id: string;
  campaign_name: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export async function upsertCampaignMetrics(rows: CampaignMetrics[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("campaign_metrics").upsert(rows, {
    onConflict: "workspace_id,customer_id,campaign_id,date",
  });
  if (error) throw error;
}

export async function getCampaignMetrics(
  workspaceId: string,
  campaignIds?: string[],
  days: number = 30
): Promise<CampaignMetrics[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  let query = supabase
    .from("campaign_metrics")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  if (campaignIds && campaignIds.length > 0) {
    query = query.in("campaign_id", campaignIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as CampaignMetrics[]) ?? [];
}

// ─── Media Plans helpers ──────────────────────────────────────────────────────

export interface MediaPlan {
  id: string;
  workspace_id: string;
  campaign_id: string;
  content_md: string;
  created_at: string;
}

export async function getMediaPlans(workspaceId: string, campaignIds: string[]): Promise<MediaPlan[]> {
  const { data, error } = await supabase
    .from("media_plans")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("campaign_id", campaignIds);
  if (error) throw error;
  return (data as MediaPlan[]) ?? [];
}

// ─── Creative Insights helpers ────────────────────────────────────────────────

export interface CreativeInsight {
  id: string;
  workspace_id: string;
  campaign_id: string;
  content_md: string;
  created_at: string;
}

export async function getCreativeInsights(workspaceId: string, campaignIds: string[]): Promise<CreativeInsight[]> {
  const { data, error } = await supabase
    .from("creative_insights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("campaign_id", campaignIds);
  if (error) throw error;
  return (data as CreativeInsight[]) ?? [];
}

// ─── Recommendations helpers ──────────────────────────────────────────────────

export async function saveRecommendations(rows: any[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("recommendations").upsert(rows, {
    onConflict: "workspace_id,date,title",
  });
  if (error) throw error;
}

export async function getRecommendations(workspaceId: string, limit = 10) {
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}


// ─── Generated outputs ────────────────────────────────────────────────────────

export async function saveOutput(row: {
  workspace_id: string;
  customer_id: string;
  date: string;
  type: string;
  content_md: string;
}) {
  const { error } = await supabase.from("generated_outputs").insert(row);
  if (error) throw error;
}

export async function saveGeneratedOutput(row: {
  workspace_id: string;
  customer_id: string;
  date: string;
  type: string;
  content_md: string;
  content_json?: object | null;
  prompt_version?: string | null;
  input_hash?: string | null;
  created_by?: string | null;
}) {
  const { error } = await supabase.from("generated_outputs").insert(row);
  if (error) throw error;
}

export async function getOutputs(
  workspaceId: string,
  retentionDays: number,
  limit = 30
) {
  const since = new Date();
  since.setDate(since.getDate() - retentionDays);
  const { data, error } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Job run history ──────────────────────────────────────────────────────────

export async function createJobRun(workspaceId: string, jobType: string) {
  const { data, error } = await supabase
    .from("job_runs")
    .insert({ workspace_id: workspaceId, job_type: jobType, status: "running" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function finishJobRun(
  id: string,
  status: "success" | "error",
  errorMessage?: string
) {
  const { error } = await supabase
    .from("job_runs")
    .update({ status, ended_at: new Date().toISOString(), error_message: errorMessage })
    .eq("id", id);
  if (error) throw error;
}

export async function getLastJobRun(workspaceId: string) {
  const { data, error } = await supabase
    .from("job_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function auditLog(
  workspaceId: string,
  actorClerkUserId: string,
  event: string,
  metadata: object = {}
) {
  await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_clerk_user_id: actorClerkUserId,
    event,
    metadata_json: metadata,
  });
}
