import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, auditLog } from "@/lib/db";
import { runJobForWorkspace } from "@/lib/jobRunner";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getOrCreateWorkspace(userId);

  try {
    await auditLog(workspace.id, userId, "manual_run_triggered", {});
    const result = await runJobForWorkspace(workspace.id, "manual");
    // Redirect back to outputs page after successful run
    return NextResponse.redirect(new URL("/outputs", req.url));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("run-now error:", msg);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(msg)}`, req.url));
  }
}
