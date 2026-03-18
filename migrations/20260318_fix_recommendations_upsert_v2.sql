-- Migration to fix the unique constraint on recommendations for ON CONFLICT upserts
-- This ensures that recommendations are unique per workspace, customer, date, and title.

-- First, remove any potentially incomplete or incorrect existing unique constraints
ALTER TABLE IF EXISTS recommendations DROP CONSTRAINT IF EXISTS recommendations_workspace_id_date_title_key;
ALTER TABLE IF EXISTS recommendations DROP CONSTRAINT IF EXISTS recommendations_workspace_id_customer_id_date_title_key;

-- Add the correct unique constraint that matches lib/db.ts
ALTER TABLE recommendations
ADD CONSTRAINT recommendations_workspace_id_customer_id_date_title_key 
UNIQUE (workspace_id, customer_id, date, title);

-- Ensure we have an index for this as well (PostgreSQL UNIQUE automatically creates an index, but good to be explicit)
CREATE INDEX IF NOT EXISTS idx_recommendations_lookup 
ON recommendations(workspace_id, customer_id, date, title);
