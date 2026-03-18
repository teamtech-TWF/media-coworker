/**
 * Deterministic output generation from daily metrics.
 * No LLM required – uses heuristics and templates.
 */

import { aggregateCampaigns, type DailySummary, type CampaignRow } from "./googleAds";
import { callOpenAIJson } from "./ai";
import { callGeminiJson } from "./gemini";
import { templates, PROMPT_VERSION } from "./prompts";
import { renderMarkdownFromAI } from "./render";
import { saveGeneratedOutput, auditLog } from "./db";
import crypto from "crypto";

// ... existing code ...

export async function generateOptimizerOutput(
  workspaceId: string,
  customerId: string,
  date: string,
  createdBy: "cron" | "manual" | "user"
) {
  const { getRecentMetrics } = await import("./db");
  const rows = await getRecentMetrics(workspaceId, 7);

  const input = { workspaceId, customerId, date, metrics: rows };
  const promptTemplate = templates.media_planner_optimizer_v1;

  try {
    const { content } = await callGeminiJson({
      system: promptTemplate.system,
      user: promptTemplate.user(input),
      schemaName: promptTemplate.schemaName,
      input,
    });

    for (const k of promptTemplate.requiredKeys) {
      if (!(k in content)) throw new Error(`missing key ${k} in Gemini response`);
    }

    const md = renderMarkdownFromAI("media_planner_optimizer", content);
    const inputHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");

    await saveGeneratedOutput({
      workspace_id: workspaceId,
      customer_id: customerId,
      date,
      type: "media_planner_optimizer",
      content_md: md,
      content_json: content,
      prompt_version: PROMPT_VERSION,
      input_hash: inputHash,
      created_by: createdBy,
    });

    await auditLog(workspaceId, "system", "gemini_generated_optimizer", { customerId });
    return { ok: true };
  } catch (err: any) {
    console.error("[generateOptimizerOutput] Gemini failed:", err?.message ?? err);
    return { ok: false, error: String(err) };
  }
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}
function fmtCurrency(n: number) {
  return `${fmt(n)} THB`;
}

function delta(current: number, previous: number): string {
  if (previous === 0) return "N/A";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// ─── 1) Performance Pulse ─────────────────────────────────────────────────────

export function generatePulse(
  today: DailySummary,
  yesterday: DailySummary | null,
  date: string,
  campaignId?: string
): string {
  const prev = yesterday;
  const lines: string[] = [
    `# 📊 Performance Pulse — ${date}${campaignId ? ` (Campaign: ${campaignId})` : ""}`,
    "",
    "## Summary",
    `| Metric | Today | vs Yesterday |`,
    `|--------|-------|--------------|`,
    `| Spend | ${fmtCurrency(today.spend)} | ${prev ? delta(today.spend, prev.spend) : "—"} |`,
    `| Impressions | ${today.impressions.toLocaleString()} | ${prev ? delta(today.impressions, prev.impressions) : "—"} |`,
    `| Clicks | ${today.clicks.toLocaleString()} | ${prev ? delta(today.clicks, prev.clicks) : "—"} |`,
    `| CTR | ${fmtPct(today.ctr)} | ${prev ? delta(today.ctr, prev.ctr) : "—"} |`,
    `| Conversions | ${fmt(today.conversions)} | ${prev ? delta(today.conversions, prev.conversions) : "—"} |`,
    `| CPA | ${fmtCurrency(today.cpa)} | ${prev ? delta(today.cpa, prev.cpa) : "—"} |`,
    `| ROAS | ${fmt(today.roas)}x | ${prev ? delta(today.roas, prev.roas) : "—"} |`,
    "",
    "## Likely Causes",
  ];

  if (prev) {
    if (today.spend > prev.spend * 1.1) lines.push("- Spend increased >10% — check budget caps or bid changes.");
    if (today.ctr < prev.ctr * 0.9) lines.push("- CTR dropped >10% — ad fatigue or audience saturation likely.");
    if (today.cpa > prev.cpa * 1.1) lines.push("- CPA increased >10% — conversion rate or competition may have shifted.");
    if (today.roas > prev.roas * 1.1) lines.push("- ROAS improved >10% — winning campaigns scaling.");
    if (lines[lines.length - 1] === "## Likely Causes") lines.push("- No significant changes detected (within ±10% thresholds).");
  } else {
    lines.push("- No previous day data available for comparison.");
  }

  lines.push("", "## Recommended Actions");
  if (today.cpa > 0 && today.losers.length > 0) {
    const loser = today.losers[0];
    lines.push(`- Review **${loser.name}**: high spend, low conversions. Consider pausing or adjusting bids.`);
  }
  if (today.winners.length > 0) {
    const winner = today.winners[0];
    lines.push(`- Scale **${winner.name}**: lowest CPA (${fmtCurrency(winner.cpa)}). Consider budget increase.`);
  }
  lines.push("- Verify conversion tracking is firing correctly if conversions are unexpectedly low.");

  lines.push("", "## Guardrails");
  lines.push(`- Do not increase any campaign budget by more than 20% in a single day.`);
  lines.push(`- Pause any campaign with CPA > 3× target before end of day review.`);

  lines.push("", "## Questions for Team");
  lines.push("1. Are there any planned promotions or landing page changes affecting today's numbers?");
  lines.push("2. Are client target CPA/ROAS thresholds still current?");

  return lines.join("\n");
}

// ─── 2) Budget & Flighting Adjust ────────────────────────────────────────────

export function generateBudgetAdjust(
  today: DailySummary,
  yesterday: DailySummary | null,
  date: string,
  campaignId?: string
): string {
  const lines: string[] = [
    `# 💰 Budget & Flighting Adjust — ${date}${campaignId ? ` (Campaign: ${campaignId})` : ""}`,
    "",
    "## Overview",
    `Total spend today: **${fmtCurrency(today.spend)}** | ROAS: **${fmt(today.roas)}x** | CPA: **${fmtCurrency(today.cpa)}**`,
    "",
    "## Campaign Recommendations",
  ];

  if (today.winners.length > 0) {
    lines.push("### 🟢 Scale Up");
    for (const c of today.winners) {
      const suggestPct = today.roas > 2 ? 15 : 10;
      lines.push(
        `- **${c.name}** — CPA ${fmtCurrency(c.cpa)}, ${c.conversions} conversions. ` +
          `Suggest +${suggestPct}% budget increase. _Rationale: strong efficiency, room to scale._`
      );
    }
  }

  if (today.losers.length > 0) {
    lines.push("", "### 🔴 Scale Down or Pause");
    for (const c of today.losers) {
      if (c.conversions === 0 && c.costMicros > 100_000) {
        lines.push(
          `- **${c.name}** — ${fmtCurrency(c.costMicros / 1e6)} spend, 0 conversions. ` +
            `Suggest pausing. _Rationale: no return on spend._`
        );
      } else {
        lines.push(
          `- **${c.name}** — High CPA (${fmtCurrency(c.cpa)}). ` +
            `Suggest -20% budget reduction. _Rationale: CPA above target threshold._`
        );
      }
    }
  }

  lines.push("", "## Flighting Notes");
  const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
  lines.push(`- Today is **${dayOfWeek}**. ${["Saturday", "Sunday"].includes(dayOfWeek) ? "Weekend — expect lower B2B conversion rates; consider reducing budgets." : "Weekday — standard pacing expected."}`);

  if (yesterday && today.spend < yesterday.spend * 0.8) {
    lines.push("- Spend dropped >20% vs yesterday. Check for disapprovals or budget exhaustion.");
  }

  return lines.join("\n");
}

// ─── 3) Client Update Generator ───────────────────────────────────────────────

export function generateClientUpdate(
  today: DailySummary,
  yesterday: DailySummary | null,
  date: string,
  customerId: string,
  campaignId?: string
): string {
  const spendDelta = yesterday ? delta(today.spend, yesterday.spend) : null;
  const roasDelta = yesterday ? delta(today.roas, yesterday.roas) : null;
  const convDelta = yesterday ? delta(today.conversions, yesterday.conversions) : null;

  const lines: string[] = [
    `# 📧 Client Update — ${date}${campaignId ? ` (Campaign: ${campaignId})` : ""}`,
    "",
    `**Subject:** Google Ads Performance Update — ${date}${campaignId ? ` (Campaign: ${campaignId})` : ""}`,
    "",
    "---",
    "",
    "Hi [Client Name],",
    "",
    `Here's a summary of your Google Ads performance for **${date}** (Account: ${customerId}):`,
    "",
    "**Key Highlights:**",
  ];

  // Positive bullets
  if (today.roas > 2) lines.push(`- 🟢 Strong ROAS of **${fmt(today.roas)}x**${roasDelta ? ` (${roasDelta} vs yesterday)` : ""}.`);
  if (today.conversions > 0) lines.push(`- 📈 Delivered **${fmt(today.conversions)} conversions** at a CPA of **${fmtCurrency(today.cpa)}**${convDelta ? ` (${convDelta} vs yesterday)` : ""}.`);
  if (today.clicks > 0) lines.push(`- 🖱️ Generated **${today.clicks.toLocaleString()} clicks** with a CTR of **${fmtPct(today.ctr)}**.`);

  // Spend line
  lines.push(`- 💸 Total spend: **${fmtCurrency(today.spend)}**${spendDelta ? ` (${spendDelta} vs yesterday)` : ""}.`);

  // Watch-outs
  const watchOuts: string[] = [];
  if (today.cpa > 0 && today.cpa > 100) watchOuts.push(`CPA of ${fmtCurrency(today.cpa)} — monitoring closely.`);
  if (today.roas < 1 && today.spend > 0) watchOuts.push(`ROAS below 1x — reviewing underperforming campaigns.`);

  if (watchOuts.length > 0) {
    lines.push("", "**Watch-outs:**");
    for (const w of watchOuts) lines.push(`- ⚠️ ${w}`);
  }

  lines.push("", "**Next Steps:**");
  if (today.winners.length > 0) lines.push(`- Scaling budget on top-performing campaigns (${today.winners.map((c) => c.name).join(", ")}).`);
  if (today.losers.length > 0 && today.losers[0].conversions === 0) lines.push(`- Reviewing underperforming campaigns for optimisation opportunities.`);
  lines.push("- Continuing to monitor performance throughout the day.");

  lines.push("", "Please let us know if you have any questions.", "", "Best regards,", "[Your Name]", "[Agency Name]");

  return lines.join("\n");
}

// ─── Generate for specific campaign ───────────────────────────────────────────

export function generatePulseForCampaign(
  allRows: CampaignRow[],
  campaignId: string,
  date: string
): string {
  const campaignRows = allRows.filter(row => row.id === campaignId && row.date === date);
  if (campaignRows.length === 0) {
    return `# 📊 Performance Pulse — ${date} (Campaign: ${campaignId})\n\nNo data available for this campaign.`;
  }

  const today = aggregateCampaigns(campaignRows);
  const yesterdayRows = allRows.filter(row => row.id === campaignId && row.date === new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const yesterday = yesterdayRows.length > 0 ? aggregateCampaigns(yesterdayRows) : null;

  return generatePulse(today, yesterday, date, campaignId);
}

export function generateBudgetAdjustForCampaign(
  allRows: CampaignRow[],
  campaignId: string,
  date: string
): string {
  const campaignRows = allRows.filter(row => row.id === campaignId && row.date === date);
  if (campaignRows.length === 0) {
    return `# 💰 Budget & Flighting Adjust — ${date} (Campaign: ${campaignId})\n\nNo data available for this campaign.`;
  }

  const today = aggregateCampaigns(campaignRows);
  const yesterdayRows = allRows.filter(row => row.id === campaignId && row.date === new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const yesterday = yesterdayRows.length > 0 ? aggregateCampaigns(yesterdayRows) : null;

  return generateBudgetAdjust(today, yesterday, date, campaignId);
}

export function generateClientUpdateForCampaign(
  allRows: CampaignRow[],
  campaignId: string,
  date: string,
  customerId: string
): string {
  const campaignRows = allRows.filter(row => row.id === campaignId && row.date === date);
  if (campaignRows.length === 0) {
    return `# 📧 Client Update — ${date} (Campaign: ${campaignId})\n\nNo data available for this campaign.`;
  }

  const today = aggregateCampaigns(campaignRows);
  const yesterdayRows = allRows.filter(row => row.id === campaignId && row.date === new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const yesterday = yesterdayRows.length > 0 ? aggregateCampaigns(yesterdayRows) : null;

  return generateClientUpdate(today, yesterday, date, customerId, campaignId);
}

// ------------------ AI generation wrapper ------------------

export async function generateOutputsAI(
  workspaceId: string,
  customerId: string,
  date: string,
  mode: "daily_pack" | "client_report_daily" | "client_report_weekly",
  createdBy: "cron" | "manual" | "user"
) {
  // For MVP we fetch recent metrics via db helper (import at top)
  // Build input payload: keep only aggregate metrics + campaign names
  // Here we assume caller will provide daily summaries; for simplicity reuse getRecentMetrics
  const { getRecentMetrics } = await import("./db");
  const rows = await getRecentMetrics(workspaceId, mode === "client_report_weekly" ? 14 : 7);

  const input = { workspaceId, customerId, date, metrics: rows };
  let promptTemplate;
  if (mode === "daily_pack") promptTemplate = templates.pulse_v1;
  else if (mode === "client_report_daily") promptTemplate = templates.client_report_daily_v1;
  else promptTemplate = templates.client_report_weekly_v1;

  // Call AI
  try {
    const system = promptTemplate.system;
    const user = promptTemplate.user(input);
    const { content } = await callOpenAIJson({ system, user, schemaName: promptTemplate.schemaName, input });

    // Validate required keys
    for (const k of promptTemplate.requiredKeys) {
      if (!(k in content)) throw new Error(`missing key ${k} in AI response`);
    }

    // Render markdown
    const md = renderMarkdownFromAI(mode, content);

    // Persist
    const inputHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
    await saveGeneratedOutput({
      workspace_id: workspaceId,
      customer_id: customerId,
      date,
      type: mode,
      content_md: md,
      content_json: content,
      prompt_version: PROMPT_VERSION,
      input_hash: inputHash,
      created_by: createdBy,
    });

    await auditLog(workspaceId, "system", `ai_generated_${mode}`, { customerId, prompt_version: PROMPT_VERSION });

    return { ok: true };
  } catch (err: any) {
    // Log and fallback
    console.error("[generateOutputsAI] AI generation failed:", err?.message ?? err);
    await auditLog(workspaceId, "system", "ai_fallback_used", { error: String(err) });
    return { ok: false, error: String(err) };
  }
}
