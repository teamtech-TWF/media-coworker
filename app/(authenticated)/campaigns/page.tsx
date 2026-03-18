import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { 
  getOrCreateWorkspace, 
  getGoogleAdsIntegration, 
  getCampaignMetrics,
  getMediaPlans,
  getCreativeInsights
} from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { refreshAccessToken, listCampaigns } from "@/lib/googleAds";
import CampaignsClient from "./CampaignsClient";

export default async function ActiveCampaignsPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const workspace = await getOrCreateWorkspace(userId);
  const integration = await getGoogleAdsIntegration(workspace.id);

  if (!integration || !integration.refresh_token_enc || integration.status !== "active") {
    // If no active integration, redirect to settings to connect Google Ads
    redirect("/settings?error=no_google_ads_integration");
  }

  let accessToken: string;
  try {
    const refreshToken = await decrypt(integration.refresh_token_enc);
    accessToken = await refreshAccessToken(refreshToken);
  } catch (error) {
    console.error("Failed to refresh Google Ads access token:", error);
    redirect("/settings?error=failed_to_refresh_token");
  }

  let campaigns = [];
  try {
    campaigns = await listCampaigns(accessToken, integration.google_ads_customer_id);
  } catch (error) {
    console.warn("Failed to list campaigns from Google Ads:", error);
    // Continue with empty campaigns array if API call fails
  }

  // Get campaign IDs to fetch additional metrics/data
  const campaignIds = campaigns.map(c => c.id);

  // Fetch from DB
  const metrics = campaignIds.length > 0 
    ? await getCampaignMetrics(workspace.id, campaignIds, 90) // Last 90 days
    : [];
  
  const mediaPlans = campaignIds.length > 0
    ? await getMediaPlans(workspace.id, campaignIds)
    : [];

  const creativeInsights = campaignIds.length > 0
    ? await getCreativeInsights(workspace.id, campaignIds)
    : [];

  return (
    <CampaignsClient 
      initialCampaigns={campaigns}
      initialMetrics={metrics}
      initialMediaPlans={mediaPlans}
      initialCreativeInsights={creativeInsights}
    />
  );
}
