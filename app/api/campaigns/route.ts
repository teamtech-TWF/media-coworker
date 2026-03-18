export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getGoogleAdsIntegration, getCampaignMetrics, getMediaPlans, getCreativeInsights } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { refreshAccessToken, listCampaigns, fetchCampaignMetricsForAccountOrManager } from "@/lib/googleAds";
import { generatePulseForCampaign, generateBudgetAdjustForCampaign, generateClientUpdateForCampaign } from "@/lib/outputGen"; // Updated imports

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ws = await getOrCreateWorkspace(userId);

  try {
    const integration = await getGoogleAdsIntegration(ws.id);
    if (!integration || integration.status !== "active") {
      return NextResponse.json({ error: "No active Google Ads integration" }, { status: 400 });
    }

    const refreshToken = await decrypt(integration.refresh_token_enc);
    const accessToken = await refreshAccessToken(refreshToken);
    const loginCustomerId = integration.google_ads_customer_id;

    // Fetch all campaigns
    const campaigns = await listCampaigns(accessToken, loginCustomerId);

    // Fetch metrics for all campaigns for a recent period (e.g., last 30 days)
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateTo = new Date().toISOString().slice(0, 10);

    // Fetch metrics for all accessible accounts/customers and their campaigns
    const allCustomerMetrics = await fetchCampaignMetricsForAccountOrManager(
      loginCustomerId, // Start from the main customer ID
      accessToken,
      dateFrom,
      dateTo,
      {
        loginCustomerId: loginCustomerId, // Use for recursive calls if needed
        concurrency: 5,
        retries: 1,
        maxDepth: 5,
      }
    );
    
    // Map fetched metrics to campaign objects for easier lookup
    const campaignMetricsMap = new Map<string, CampaignRow[]>();
    allCustomerMetrics.forEach(metric => {
      if (!campaignMetricsMap.has(metric.id)) {
        campaignMetricsMap.set(metric.id, []);
      }
      campaignMetricsMap.get(metric.id)?.push(metric);
    });

    // Enrich campaign list with metrics
    const enrichedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      // Note: metrics here are an array for a given campaign over the date range,
      // the frontend will need to aggregate or select relevant data.
      metrics: campaignMetricsMap.get(campaign.id) || [],
    }));

    return NextResponse.json({ campaigns: enrichedCampaigns });
  } catch (error: any) {
    console.error("Failed to list campaigns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ws = await getOrCreateWorkspace(userId);

  const body = await req.json().catch(() => ({}));
  const { campaignIds, type, date } = body; // date is optional, defaults to today

  if (!Array.isArray(campaignIds) || campaignIds.length === 0) return NextResponse.json({ error: "campaignIds required" }, { status: 400 });
  if (!["pulse", "budget_adjust", "client_update"].includes(type)) return NextResponse.json({ error: "invalid type" }, { status: 400 });

  try {
    const integration = await getGoogleAdsIntegration(ws.id);
    if (!integration || integration.status !== "active") {
      return NextResponse.json({ error: "No active Google Ads integration" }, { status: 400 });
    }

    const refreshToken = await decrypt(integration.refresh_token_enc);
    const accessToken = await refreshAccessToken(refreshToken);
    const customerId = integration.google_ads_customer_id;

    // Fetch recent metrics for the selected campaigns
    const recentMetrics = await getCampaignMetrics(ws.id, campaignIds, 7); // Get last 7 days of campaign metrics

    let content: string;
    const reportDate = date || new Date().toISOString().slice(0, 10);

    if (type === "pulse") {
      content = generatePulseForCampaign(recentMetrics, campaignIds, reportDate);
    } else if (type === "budget_adjust") {
      content = generateBudgetAdjustForCampaign(recentMetrics, campaignIds, reportDate);
    } else if (type === "client_update") {
      content = generateClientUpdateForCampaign(recentMetrics, campaignIds, reportDate, customerId);
    } else {
      // Should not happen due to initial check, but for safety
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error(`Failed to generate ${type} for campaign(s):`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
