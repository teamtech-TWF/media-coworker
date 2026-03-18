import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAuthorizationUrl } from "@/lib/googleAds";
import { getOrCreateWorkspace } from "@/lib/db";
import { auditLog } from "@/lib/db";

export async function GET() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const workspace = await getOrCreateWorkspace(userId);
  // Use workspace id as state to verify callback
  const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id, userId })).toString("base64url");
  const url = getAuthorizationUrl(state);

  await auditLog(workspace.id, userId, "google_ads_connect_initiated", {});

  redirect(url);
}
