export const PROMPT_VERSION = "mcw_ai_v1";

export type PromptTemplate = {
  schemaName: string;
  system: string;
  user: (input: any) => string;
  requiredKeys: string[];
};

function baseSystem() {
  return `You are a helpful expert digital ads analyst. Only respond with JSON that matches the requested schema. Do not include commentary or markdown outside the JSON. Do not hallucinate data. Use only the provided input data. If data is insufficient, return {"error":"insufficient data","questions":[...]}.
PDPA: ensure no PII is present; only use aggregate metrics and campaign or entity names.`;
}

export const pulse_v1: PromptTemplate = {
  schemaName: "pulse_v1",
  system: baseSystem(),
  user: (input) => {
    return `Produce a Performance Pulse for date=${input.date}. Input contains aggregate metrics for the target window and previous window. Return JSON with keys: summary (string), insights (array of strings), actions (array of strings), evidence (array of strings citing metrics).`;
  },
  requiredKeys: ["summary", "insights", "actions", "evidence"],
};

export const budget_adjust_v1: PromptTemplate = {
  schemaName: "budget_adjust_v1",
  system: baseSystem(),
  user: (input) => `Provide campaign-level budget recommendations. Return JSON: {recommendations:[{campaign,action,rationale}], flighting_notes:[]}`,
  requiredKeys: ["recommendations"],
};

export const client_update_v1: PromptTemplate = {
  schemaName: "client_update_v1",
  system: baseSystem(),
  user: (input) => `Generate a client-facing update email. Return JSON: {subject:string, body_md:string}`,
  requiredKeys: ["subject", "body_md"],
};

export const client_report_daily_v1: PromptTemplate = {
  schemaName: "client_report_daily_v1",
  system: baseSystem(),
  user: (input) => `Generate a daily client report. Return JSON: {title:string, sections:[{heading:string,body_md:string}], summary_md:string}`,
  requiredKeys: ["title", "sections", "summary_md"],
};

export const client_report_weekly_v1: PromptTemplate = {
  schemaName: "client_report_weekly_v1",
  system: baseSystem(),
  user: (input) => `Generate a weekly client report. Return JSON: {title:string, sections:[{heading:string,body_md:string}], summary_md:string}`,
  requiredKeys: ["title", "sections", "summary_md"],
};

export const media_planner_optimizer_v1: PromptTemplate = {
  schemaName: "media_planner_optimizer_v1",
  system: baseSystem() + "\nFocus on actionable media planning and channel optimization. Identify scaling opportunities and efficiency gains.",
  user: (input) => `Act as a Senior Media Planner. Analyze the performance data for ${input.date}. 
  Focus on:
  1. Channel Mix & Allocation: How should budget be shifted between campaigns?
  2. Scaling Potential: Which campaigns can handle significantly more budget (2x-5x)?
  3. Risk Mitigation: Which campaigns are wasting budget?
  4. Optimization Steps: Specific bid or creative changes needed.
  
  Return JSON: {
    title: string,
    executive_summary: string,
    allocation_changes: [{campaign: string, current_spend: number, proposed_spend: number, rationale: string}],
    scaling_opportunities: [{campaign: string, opportunity_level: string, target_metrics: string}],
    efficiency_levers: [string],
    optimization_plan_md: string
  }`,
  requiredKeys: ["title", "executive_summary", "allocation_changes", "scaling_opportunities", "efficiency_levers", "optimization_plan_md"],
};

export const templates = {
  pulse_v1,
  budget_adjust_v1,
  client_update_v1,
  client_report_daily_v1,
  client_report_weekly_v1,
  media_planner_optimizer_v1,
};
