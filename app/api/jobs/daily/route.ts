import { type NextRequest, NextResponse } from "next/server";
import { getAllWorkspacesWithGoogleAds } from "@/lib/db";
import { runJobForWorkspace } from "@/lib/jobRunner";

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await getAllWorkspacesWithGoogleAds();
  const results: { workspaceId: string; status: string; error?: string }[] = [];

  for (const ws of workspaces) {
    try {
      await runJobForWorkspace(ws.id, "daily");
      results.push({ workspaceId: ws.id, status: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Daily job failed for workspace ${ws.id}:`, msg);
      results.push({ workspaceId: ws.id, status: "error", error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
