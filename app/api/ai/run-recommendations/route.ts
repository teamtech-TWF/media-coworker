import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getGoogleAdsIntegration, getRecentMetrics, saveRecommendations, auditLog } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { refreshAccessToken, fetchCampaignMetrics, aggregateCampaigns } from "@/lib/googleAds";
import { generateRecommendations } from "@/lib/outputGen";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateWorkspace(userId);

  try {
    const integration = await getGoogleAdsIntegration(workspace.id);
    if (!integration || integration.status !== "active") {
      throw new Error("No active Google Ads integration");
    }

    const refreshToken = await decrypt(integration.refresh_token_enc);
    const accessToken = await refreshAccessToken(refreshToken);
    const customerId = integration.google_ads_customer_id;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Fetch metrics
    const rows = await fetchCampaignMetrics(customerId, accessToken, yesterdayStr, today);
    const todayRows = rows.filter((r) => r.date === today);
    const yestRows = rows.filter((r) => r.date === yesterdayStr);

    const todaySummary = aggregateCampaigns(todayRows.length > 0 ? todayRows : rows);
    const yestSummary = yestRows.length > 0 ? aggregateCampaigns(yestRows) : null;

    // Generate recommendations
    const recommendations = await generateRecommendations(
      workspace.id,
      customerId,
      today,
      todaySummary,
      yestSummary,
      rows
    );

    if (recommendations.length > 0) {
      await saveRecommendations(recommendations);
    }

    await auditLog(workspace.id, userId, "recommendations_triggered_manually", { count: recommendations.length });

    return NextResponse.json({ success: true, count: recommendations.length });
  } catch (err: any) {
    console.error("[run-recommendations] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
