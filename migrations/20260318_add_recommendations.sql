-- Migration: Add recommendations table for Phase 1
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence JSONB,
  confidence FLOAT DEFAULT 0.0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'snoozed')),
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, date, title)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_recommendations_workspace_date ON recommendations(workspace_id, date);

-- RLS Policies (assuming standard workspace-based access)
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recommendations for their workspace"
  ON recommendations FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()::text));
