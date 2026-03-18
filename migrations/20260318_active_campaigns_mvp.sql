-- Migration: Active Campaigns MVP
-- Add tables for campaign-level metrics, media plans, and creative insights

-- Campaign-level daily metrics
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  date DATE NOT NULL,
  spend NUMERIC(18,4) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions NUMERIC(18,4) DEFAULT 0,
  revenue NUMERIC(18,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, customer_id, campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_ws_date ON campaign_metrics(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);

-- Optional Media Plans (Graceful degradation if missing)
CREATE TABLE IF NOT EXISTS media_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  target_cpa NUMERIC(18,4),
  target_roas NUMERIC(18,4),
  daily_budget_target NUMERIC(18,4),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, customer_id, campaign_id)
);

-- Optional Creative Intelligence / Asset Insights (Graceful degradation if missing)
CREATE TABLE IF NOT EXISTS creative_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  top_performing_headlines JSONB DEFAULT '[]',
  top_performing_descriptions JSONB DEFAULT '[]',
  asset_performance_summary TEXT,
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, customer_id, campaign_id)
);

-- RLS Policies
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_insights ENABLE ROW LEVEL SECURITY;
