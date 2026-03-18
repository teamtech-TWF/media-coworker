/**
 * Deterministic output generation from daily metrics.
 * No LLM required – uses heuristics and templates.
 */

import { aggregateCampaigns, type DailySummary, type CampaignRow } from "./googleAds";
import { callOpenAIJson } from "./ai";
import { callGeminiJson } from "./gemini";
import { templates, PROMPT_VERSION } from "./prompts";
import { renderMarkdownFromAI } from "./render";
import { saveGeneratedOutput, auditLog, getCampaignMetrics, getMediaPlans, getCreativeInsights, type CampaignMetrics } from "./db";
import crypto from "crypto";

// ─── Campaign-Specific Output Generators ──────────────────────────────────────

// Helper to aggregate metrics for a specific set of campaigns over a period
function aggregateCampaignMetricsForCampaigns(
  allMetrics: CampaignMetrics[],
  campaignIds: string[]
): DailySummary {
  const relevantMetrics = allMetrics.filter(m => campaignIds.includes(m.campaign_id));

  const spend = relevantMetrics.reduce((sum, row) => sum + (row.spend ?? 0), 0);
  const impressions = relevantMetrics.reduce((sum, row) => sum + (row.impressions ?? 0), 0);
  const clicks = relevantMetrics.reduce((sum, row) => sum + (row.clicks ?? 0), 0);
  const conversions = relevantMetrics.reduce((sum, row) => sum + (row.conversions ?? 0), 0);
  const revenue = relevantMetrics.reduce((sum, row) => sum + (row.revenue ?? 0), 0);
  
  // Note: CTR, CVR, CPA, ROAS calculations might need careful handling for aggregated campaign data
  // For now, these are basic calculations based on aggregated values.
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cvr = clicks > 0 ? conversions / clicks : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  // Placeholder for winners/losers logic based on aggregated data if needed
  const winners: CampaignRow[] = []; 
  const losers: CampaignRow[] = [];

  return {
    spend, impressions, clicks, conversions, revenue, ctr, cvr, cpa, roas, winners, losers
  };
}

// ─── Phase 1: Recommendations Generator for Selected Campaigns ──────────────────

export async function generateCampaignRecommendations(
  workspaceId: string,
  customerId: string,
  campaignIds: string[],
  campaignMetrics: CampaignMetrics[], // Fetched campaign-level metrics
  mediaPlans?: any[], // Optional media plan data
  creativeInsights?: any[] // Optional creative insight data
) {
  const prompt = `
    You are an expert Google Ads Strategist specializing in campaign-level analysis.
    Analyze the provided performance data for the selected campaigns and offer actionable recommendations.

    Selected Campaigns: [${campaignIds.join(", ")}]

    Performance Data (last 30 days for selected campaigns):
    ${JSON.stringify(campaignMetrics, null, 2)}

    ${mediaPlans && mediaPlans.length > 0 ? `
    Media Plan Comparison:
    ${JSON.stringify(mediaPlans, null, 2)}
    ` : ""}

    ${creativeInsights && creativeInsights.length > 0 ? `
    Creative Intelligence Insights:
    ${JSON.stringify(creativeInsights, null, 2)}
    ` : ""}

    Return ONLY a JSON array of objects with the following schema:
    [
      {
        "title": "Short action-oriented title (e.g., Optimize Campaign X Budget)",
        "reason": "Why this is recommended (1-2 sentences), referencing specific data points from the selected campaigns.",
        "evidence": { "metric": "value", "trend": "description", "data_points": [...] },
        "confidence": 0.0 to 1.0
      }
    ]
  `;

  try {
    const { content, model } = await callGeminiJson({
      system: "You are a specialized media buying assistant focused on campaign-level optimization. Return structured JSON only.",
      user: prompt,
      schemaName: "campaign_recommendations",
      input: { workspaceId, customerId, campaignIds, dateRange: "last_30_days" }, // Simplified input for logging/tracing
    });

    const items = Array.isArray(content) ? content : [];

    return items.map((item: any) => ({
      workspace_id: workspaceId,
      customer_id: customerId,
      // Note: Need to decide how to associate recommendations with specific campaigns if generated for multiple.
      // For now, assume general recommendations for the selected set.
      date: new Date().toISOString().slice(0, 10), // Current date for the recommendation
      title: item.title || "Campaign Optimization Opportunity",
      reason: item.reason || "Performance patterns suggest this change.",
      evidence: item.evidence || {},
      confidence: item.confidence || 0.7,
      status: "pending" as const,
      ai_model: model,
    }));
  } catch (err) {
    console.error("[generateCampaignRecommendations] Gemini failed:", err);
    // TODO: Potentially log this error more robustly
    return []; // Return empty array on error
  }
}

// ─── Existing output generators (adapt as needed for campaign-specific data) ───────────────────

// Existing generators like generatePulse, generateBudgetAdjust, generateClientUpdate might need adaptation
// if they are intended to be called for *specific* campaigns selected by the user.
// For now, assume they operate on aggregated data or are called in a context where campaignId is relevant.

// Example adaptation for generatePulseForCampaign to use campaign-specific data:
export function generatePulseForCampaign(
  allCampaignMetrics: CampaignMetrics[], // Expecting campaign-level metrics
  campaignIds: string[], // Array of selected campaign IDs
  date: string,
): string {
  if (campaignIds.length === 0) return "# Performance Pulse — No campaigns selected.";
  
  const selectedMetrics = allCampaignMetrics.filter(m => campaignIds.includes(m.campaign_id) && m.date === date);
  
  if (selectedMetrics.length === 0) {
    return `# Performance Pulse — ${date}

No data available for the selected campaigns on ${date}.`;
  }

  // Aggregate metrics for the selected campaigns for the given date
  const today = aggregateCampaignMetricsForCampaigns(selectedMetrics, campaignIds);
  
  // Fetch yesterday's data for comparison (this logic needs refinement to correctly get yesterday's data for the selected set)
  const yesterdayMetrics = allCampaignMetrics.filter(m => campaignIds.includes(m.campaign_id) && m.date === new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const yesterday = yesterdayMetrics.length > 0 ? aggregateCampaignMetricsForCampaigns(yesterdayMetrics, campaignIds) : null;

  // Reuse existing generatePulse logic, but pass aggregated data
  return generatePulse(today, yesterday, date, campaignIds.join(", ")); // Pass campaign IDs as a string if needed
}


// Example adaptation for generateBudgetAdjustForCampaign:
export function generateBudgetAdjustForCampaign(
  allCampaignMetrics: CampaignMetrics[],
  campaignIds: string[],
  date: string,
): string {
  if (campaignIds.length === 0) return `# Budget & Flighting Adjust — No campaigns selected.`;
  
  const selectedMetrics = allCampaignMetrics.filter(m => campaignIds.includes(m.campaign_id) && m.date === date);
  if (selectedMetrics.length === 0) {
    return `# Budget & Flighting Adjust — ${date}

No data available for the selected campaigns on ${date}.`;
  }

  const today = aggregateCampaignMetricsForCampaigns(selectedMetrics, campaignIds);
  const yesterdayMetrics = allCampaignMetrics.filter(m => campaignIds.includes(m.campaign_id) && m.date === new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const yesterday = yesterdayMetrics.length > 0 ? aggregateCampaignMetricsForCampaigns(yesterdayMetrics, campaignIds) : null;

  return generateBudgetAdjust(today, yesterday, date, campaignIds.join(", "));
}


// Example adaptation for generateClientUpdateForCampaign:
export function generateClientUpdateForCampaign(
  allCampaignMetrics: CampaignMetrics[],
  campaignIds: string[],
  date: string,
  customerId: string // customerId might be derived from the selected campaigns
): string {
  if (campaignIds.length === 0) return `# Client Update — ${date}

No campaigns selected.`;

  const selectedMetrics = allCampaignMetrics.filter(m => campaignIds.includes(m.campaign_id) && m.date === date);
  if (selectedMetrics.length === 0) {
    return `# Client Update — ${date}

No data available for the selected campaigns on ${date}.`;
  }

  const today = aggregateCampaignMetricsForCampaigns(selectedMetrics, campaignIds);
  const yesterdayMetrics = allCampaignMetrics.filter(m => campaignIds.includes(m.campaign_id) && m.date === new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const yesterday = yesterdayMetrics.length > 0 ? aggregateCampaignMetricsForCampaigns(yesterdayMetrics, campaignIds) : null;

  // Reuse existing generateClientUpdate logic
  return generateClientUpdate(today, yesterday, date, customerId, campaignIds.join(", "));
}

// ─── Utility Functions (existing ones like fmt, fmtPct, delta etc. are assumed to be available) ─────────────────
// Ensure these helper functions are available in the scope or imported.

// Placeholder for existing functions if not in this file:
function fmt(n: number, decimals = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
function fmtPct(n: number) { return `${(n * 100).toFixed(2)}%`; }
function fmtCurrency(n: number) { return `$${fmt(n)}`; } // Assuming USD for now
function delta(current: number, previous: number): string {
  if (previous === 0) return "N/A";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// Placeholder for CampaignRow if needed for type clarity in aggregation logic
interface CampaignRow {
  id: string; name: string; status: string; channelType: string;
  costMicros: number; impressions: number; clicks: number;
  conversions: number; conversionsValue: number; ctr: number;
  avgCpc: number; cpa: number; date: string;
  customerId?: string; customerDescriptiveName?: string;
}
// Placeholder for DailySummary if needed
interface DailySummary {
  spend: number; impressions: number; clicks: number; conversions: number;
  revenue: number; ctr: number; cvr: number; cpa: number; roas: number;
  winners: CampaignRow[]; losers: CampaignRow[];
}

// Placeholder for existing generators
function generatePulse(today: DailySummary, yesterday: DailySummary | null, date: string, campaignId?: string): string { return `# Pulse for ${date} - Campaign: ${campaignId || 'All'}`; }
function generateBudgetAdjust(today: DailySummary, yesterday: DailySummary | null, date: string, campaignId?: string): string { return `# Budget Adjust for ${date} - Campaign: ${campaignId || 'All'}`; }
function generateClientUpdate(today: DailySummary, yesterday: DailySummary | null, date: string, customerId: string, campaignId?: string): string { return `# Client Update for ${date} - Campaign: ${campaignId || 'All'}`; }
