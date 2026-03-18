-- Media Coworker – Supabase Schema
-- Run this in the Supabase SQL editor

create extension if not exists "pgcrypto";

-- Workspaces (one per Clerk user for MVP)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  plan text not null default 'free',          -- 'free' | 'pro'
  retention_days int not null default 7,
  created_at timestamptz not null default now()
);

-- Google Ads integration
create table if not exists integrations_google_ads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  google_ads_customer_id text not null,
  refresh_token_enc text not null,            -- AES-256-GCM encrypted, base64url
  scopes text not null,
  status text not null default 'active',      -- 'active' | 'revoked' | 'error'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integrations_google_ads_workspace_idx
  on integrations_google_ads(workspace_id);

-- Daily aggregate metrics (no PII)
create table if not exists daily_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id text not null,
  date date not null,
  spend numeric(18,4) default 0,
  impressions bigint default 0,
  clicks bigint default 0,
  conversions numeric(18,4) default 0,
  revenue numeric(18,4) default 0,
  ctr numeric(10,6) default 0,
  cvr numeric(10,6) default 0,
  cpa numeric(18,4) default 0,
  roas numeric(18,4) default 0,
  winners_json jsonb default '[]',
  losers_json jsonb default '[]',
  created_at timestamptz not null default now(),
  unique(workspace_id, customer_id, date)
);

-- Generated outputs (Pulse, Budget, Client Update)
create table if not exists generated_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id text not null,
  date date not null,
  type text not null,                         -- 'pulse' | 'budget' | 'client'
  content_md text not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_outputs_ws_date_idx
  on generated_outputs(workspace_id, date desc);

-- Job run history
create table if not exists job_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  job_type text not null,                     -- 'daily' | 'manual'
  status text not null,                       -- 'running' | 'success' | 'error'
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  error_message text
);

-- Audit log
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_clerk_user_id text not null,
  event text not null,
  metadata_json jsonb default '{}',
  created_at timestamptz not null default now()
);

-- RLS: service role bypasses all; no direct client access needed for MVP
alter table workspaces enable row level security;
alter table integrations_google_ads enable row level security;
alter table daily_metrics enable row level security;
alter table generated_outputs enable row level security;
alter table job_runs enable row level security;
alter table audit_logs enable row level security;
