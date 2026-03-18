/**
 * Core pull-and-generate logic shared by daily cron and manual run.
 */

import { decrypt } from "./crypto";
import {
  getGoogleAdsIntegration,
  upsertDailyMetrics,
  saveOutput,
  createJobRun,
  finishJobRun,
} from "./db";
import {
  refreshAccessToken,
  fetchCampaignMetrics,
  aggregateCampaigns,
} from "./googleAds";
import {
  generatePulse,
  generateBudgetAdjust,
  generateClientUpdate,
  generateOptimizerOutput,
  generateRecommendations,
} from "./outputGen";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

type JobType = "daily" | "manual";
type OptimizerTrigger = "cron" | "manual" | "user";

function mapJobTypeToOptimizerTrigger(jobType: JobType): OptimizerTrigger {
  switch (jobType) {
    case "daily":
      return "cron";
    case "manual":
      return "manual";
    default: {
      const exhaustiveCheck: never = jobType;
      throw new Error(`Unsupported jobType: ${exhaustiveCheck}`);
    }
  }
}

export async function runJobForWorkspace(
  workspaceId: string,
  jobType: JobType
) {
  const run = await createJobRun(workspaceId, jobType);

  try {
    const integration = await getGoogleAdsIntegration(workspaceId);
    if (!integration || integration.status !== "active") {
      throw new Error("No active Google Ads integration");
    }

    const refreshToken = await decrypt(integration.refresh_token_enc);
    const accessToken = await refreshAccessToken(refreshToken);
    const customerId = integration.google_ads_customer_id;

    const today = todayStr();
    const yesterday = yesterdayStr();

    // Fetch campaign rows for yesterday (full day) and today (partial)
    const rows = await fetchCampaignMetrics(
      customerId,
      accessToken,
      yesterday,
      today
    );

    // Split by date
    const todayRows = rows.filter((r) => r.date === today);
    const yestRows = rows.filter((r) => r.date === yesterday);

    const todaySummary = aggregateCampaigns(todayRows.length > 0 ? todayRows : rows);
    const yestSummary = yestRows.length > 0 ? aggregateCampaigns(yestRows) : null;

    // Save metrics
    await upsertDailyMetrics({
      workspace_id: workspaceId,
      customer_id: customerId,
      date: today,
      spend: todaySummary.spend,
      impressions: todaySummary.impressions,
      clicks: todaySummary.clicks,
      conversions: todaySummary.conversions,
      revenue: todaySummary.revenue,
      ctr: todaySummary.ctr,
      cvr: todaySummary.cvr,
      cpa: todaySummary.cpa,
      roas: todaySummary.roas,
      winners_json: todaySummary.winners,
      losers_json: todaySummary.losers,
    });

    // Generate outputs
    const pulse = generatePulse(todaySummary, yestSummary, today);
    const budget = generateBudgetAdjust(todaySummary, yestSummary, today);
    const client = generateClientUpdate(
      todaySummary,
      yestSummary,
      today,
      customerId
    );

    for (const [type, content_md] of [
      ["pulse", pulse],
      ["budget", budget],
      ["client", client],
    ] as const) {
      await saveOutput({
        workspace_id: workspaceId,
        customer_id: customerId,
        date: today,
        type,
        content_md,
      });
    }

    // AI Media Planner / Optimizer (Gemini)
    try {
      const optimizerTrigger = mapJobTypeToOptimizerTrigger(jobType);
      await generateOptimizerOutput(
        workspaceId,
        customerId,
        today,
        optimizerTrigger
      );

      // Phase 1: Recommendations
      const recommendations = await generateRecommendations(
        workspaceId,
        customerId,
        today,
        todaySummary,
        yestSummary,
        rows
      );
      if (recommendations.length > 0) {
        const { saveRecommendations } = await import("./db");
        await saveRecommendations(recommendations);
      }
    } catch (err) {
      console.warn("[jobRunner] AI outputs failed:", err);
    }

    await finishJobRun(run.id, "success");
    return { success: true, customerId, date: today };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await finishJobRun(run.id, "error", msg);
    throw err;
  }
}