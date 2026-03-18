import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, revokeGoogleAdsIntegration, auditLog } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const workspace = await getOrCreateWorkspace(userId);
  await revokeGoogleAdsIntegration(workspace.id);
  await auditLog(workspace.id, userId, "google_ads_disconnected", {});

  return NextResponse.redirect(new URL("/settings?success=disconnected", req.url));
}
