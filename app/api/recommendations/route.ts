import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getRecommendations, updateRecommendationStatus } from "@/lib/db";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ws = await getOrCreateWorkspace(userId);
  const data = await getRecommendations(ws.id);
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ws = await getOrCreateWorkspace(userId);
  const { id, status } = await req.json();

  if (!id || !["approved", "rejected", "snoozed"].includes(status)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  await updateRecommendationStatus(id, ws.id, status);
  return NextResponse.json({ success: true });
}
