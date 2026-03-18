-- Add AI fields to generated_outputs for content_json, prompt versioning, input hash, creator
ALTER TABLE generated_outputs
  ADD COLUMN content_json jsonb NULL,
  ADD COLUMN prompt_version text NULL,
  ADD COLUMN input_hash text NULL,
  ADD COLUMN created_by text NULL;

-- Optional index on input_hash
CREATE INDEX IF NOT EXISTS idx_generated_outputs_input_hash ON generated_outputs(input_hash);
