export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getGoogleAdsIntegration, getCampaignMetrics, getMediaPlans, getCreativeInsights } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { refreshAccessToken } from "@/lib/googleAds";
import { generateCampaignRecommendations } from "@/lib/outputGen"; // Assuming this function exists and is updated

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateWorkspace(userId);

  const body = await req.json().catch(() => ({}));
  const { campaignIds } = body;

  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    return NextResponse.json({ error: "Invalid input: campaignIds array is required and cannot be empty." }, { status: 400 });
  }

  try {
    const integration = await getGoogleAdsIntegration(workspace.id);
    if (!integration || integration.status !== "active") {
      throw new Error("No active Google Ads integration found.");
    }

    const refreshToken = await decrypt(integration.refresh_token_enc);
    const accessToken = await refreshAccessToken(refreshToken);
    const customerId = integration.google_ads_customer_id;
    // loginCustomerId is typically the customerId itself for direct accounts or a manager ID if needed for specific calls.
    // For fetching campaign-level data, it's often beneficial to pass the customerId that owns the campaigns.
    const loginCustomerId = customerId; 

    // Fetch metrics for selected campaigns
    // Fetching for a reasonable recent period, e.g., last 30 days for aggregation.
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateTo = new Date().toISOString().slice(0, 10);

    // Fetch campaign metrics using the new DB helper
    const campaignMetrics = await getCampaignMetrics(workspace.id, campaignIds, 30);
    
    // Fetch optional data if available using DB helpers
    const mediaPlans = await getMediaPlans(workspace.id, campaignIds);
    const creativeInsights = await getCreativeInsights(workspace.id, campaignIds);

    // Generate recommendations using AI, passing all fetched data
    const recommendations = await generateCampaignRecommendations(
      workspace.id,
      customerId, // Pass the customerId
      campaignIds,
      campaignMetrics,
      mediaPlans,
      creativeInsights
    );

    // TODO: Save recommendations to DB if necessary.
    // For now, just returning the generated recommendations.
    // await saveRecommendations(recommendations); // Assuming a similar function exists for campaign-specific recommendations

    return NextResponse.json({ recommendations });
  } catch (err: any) {
    console.error("[run-campaign-recommendations] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
