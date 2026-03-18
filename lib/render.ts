export function renderMarkdownFromAI(type: string, json: any): string {
  // Specialized rendering for media_planner_optimizer
  if (type === "media_planner_optimizer" || json.executive_summary) {
    const parts: string[] = [];
    parts.push(`# 🎯 ${json.title || "Media Planner & Optimizer"}`);
    parts.push(`\n## 📋 Executive Summary\n${json.executive_summary}`);

    if (json.allocation_changes && Array.isArray(json.allocation_changes)) {
      parts.push("\n## ⚖️ Proposed Budget Allocation Changes");
      for (const c of json.allocation_changes) {
        parts.push(`- **${c.campaign}**: ${c.current_spend} → **${c.proposed_spend}**\n  *Rationale:* ${c.rationale}`);
      }
    }

    if (json.scaling_opportunities && Array.isArray(json.scaling_opportunities)) {
      parts.push("\n## 🚀 High Scaling Potential");
      for (const s of json.scaling_opportunities) {
        parts.push(`- **${s.campaign}** (${s.opportunity_level} Opportunity)\n  *Target:* ${s.target_metrics}`);
      }
    }

    if (json.efficiency_levers && Array.isArray(json.efficiency_levers)) {
      parts.push("\n## 🔧 Efficiency Levers to Pull");
      for (const l of json.efficiency_levers) {
        parts.push(`- ${l}`);
      }
    }

    if (json.optimization_plan_md) {
      parts.push(`\n## 🛠️ Step-by-Step Optimization Plan\n${json.optimization_plan_md}`);
    }

    return parts.join("\n");
  }

  // If the model already produced markdown, use it
  if (json.body_md) return json.body_md;
  if (json.summary_md) return json.summary_md;
  if (json.sections && Array.isArray(json.sections)) {
    const parts: string[] = [];
    parts.push(`# ${json.title ?? type}`);
    for (const s of json.sections) {
      parts.push(`\n## ${s.heading}\n`);
      parts.push(s.body_md || s.body || "");
    }
    return parts.join("\n");
  }

  // Fallback simple render
  if (json.summary) return `# ${type}\n\n${json.summary}`;
  return `# ${type}\n\n(No content)`;
}
