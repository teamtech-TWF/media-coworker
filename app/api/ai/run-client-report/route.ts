export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateOutputsAI } from "@/lib/outputGen";
import { allowedByIp, allowedByUser } from "@/lib/rateLimit";
import { auditLog, getOrCreateWorkspace } from "@/lib/db";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!allowedByIp(ip) || !allowedByUser(userId)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const type = body.type as string;
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  const customerId = body.customerId ?? null;

  if (!["client_report_daily", "client_report_weekly"].includes(type)) return NextResponse.json({ error: "invalid_type" }, { status: 400 });

  const ws = await getOrCreateWorkspace(userId);

  const res = await generateOutputsAI(ws.id, customerId, date, type === "client_report_weekly" ? "client_report_weekly" : "client_report_daily", "user");

  await auditLog(ws.id, userId, "ai_generate_client_report", { date, customerId, type, result: res.ok });

  if (!res.ok) return NextResponse.json({ error: res.error ?? "generation_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
