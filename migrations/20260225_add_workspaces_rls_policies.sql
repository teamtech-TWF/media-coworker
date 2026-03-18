-- Migration: Add RLS policies for workspaces table
-- Purpose: Allow authenticated users to insert/read/update/delete their own workspace rows
-- Date: 2026-02-25

-- Allow authenticated users to INSERT their own workspace rows
CREATE POLICY IF NOT EXISTS "Allow authenticated insert on workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (clerk_user_id = auth.uid());

-- Allow authenticated users to SELECT rows that belong to them
CREATE POLICY IF NOT EXISTS "Select own workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (clerk_user_id = auth.uid());

-- Allow authenticated users to UPDATE/DELETE only their own rows
CREATE POLICY IF NOT EXISTS "Modify own workspaces"
ON public.workspaces
FOR UPDATE, DELETE
TO authenticated
USING (clerk_user_id = auth.uid())
WITH CHECK (clerk_user_id = auth.uid());
