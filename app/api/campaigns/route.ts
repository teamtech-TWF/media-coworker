export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listCampaigns, refreshAccessToken } from "@/lib/googleAds";
import { getOrCreateWorkspace, getGoogleAdsIntegration } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

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
    const campaigns = await listCampaigns(accessToken);
    return NextResponse.json({ campaigns });
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
  const { campaignId, type, date } = body;

  if (!campaignId || !type) return NextResponse.json({ error: "campaignId and type required" }, { status: 400 });
  if (!["pulse", "budget_adjust", "client_update"].includes(type)) return NextResponse.json({ error: "invalid type" }, { status: 400 });

  try {
    const integration = await getGoogleAdsIntegration(ws.id);
    if (!integration || integration.status !== "active") {
      return NextResponse.json({ error: "No active Google Ads integration" }, { status: 400 });
    }

    const refreshToken = await decrypt(integration.refresh_token_enc);
    const accessToken = await refreshAccessToken(refreshToken);
    const customerId = integration.google_ads_customer_id;

    // Fetch recent metrics
    const { getRecentMetrics } = await import("@/lib/db");
    const allRows = await getRecentMetrics(ws.id, 7); // Get last 7 days

    let content: string;
    if (type === "pulse") {
      const { generatePulseForCampaign } = await import("@/lib/outputGen");
      content = generatePulseForCampaign(allRows, campaignId, date || new Date().toISOString().slice(0, 10));
    } else if (type === "budget_adjust") {
      const { generateBudgetAdjustForCampaign } = await import("@/lib/outputGen");
      content = generateBudgetAdjustForCampaign(allRows, campaignId, date || new Date().toISOString().slice(0, 10));
    } else {
      const { generateClientUpdateForCampaign } = await import("@/lib/outputGen");
      content = generateClientUpdateForCampaign(allRows, campaignId, date || new Date().toISOString().slice(0, 10), customerId);
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("Failed to generate for campaign:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}