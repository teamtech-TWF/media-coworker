export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateOutputsAI } from "@/lib/outputGen";
import { allowedByIp, allowedByUser } from "@/lib/rateLimit";
import { auditLog } from "@/lib/db";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!allowedByIp(ip) || !allowedByUser(userId)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  const customerId = body.customerId ?? null;

  // Resolve workspace id via getOrCreateWorkspace
  const { getOrCreateWorkspace } = await import("@/lib/db");
  const ws = await getOrCreateWorkspace(userId);

  // Run AI generation for daily_pack (created_by = user)
  const res = await generateOutputsAI(ws.id, customerId, date, "daily_pack", "user");

  await auditLog(ws.id, userId, "ai_generate_daily_pack", { date, customerId, result: res.ok });

  if (!res.ok) return NextResponse.json({ error: res.error ?? "generation_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
