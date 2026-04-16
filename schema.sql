-- Planning Poker & Board MVP Database Schema
-- Run this in your Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  v_app_version TEXT NOT NULL,
  name TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('poker', 'board')),
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'voting', 'revealed', 'board')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Participants Table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stories Table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  final_estimate TEXT,
  average_vote NUMERIC,
  suggested_estimate TEXT,
  revealed_votes JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. Votes Table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  UNIQUE(story_id, participant_id)
);

-- 5. Board Tasks Table
CREATE TABLE IF NOT EXISTS board_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  order_index INTEGER NOT NULL DEFAULT 0,
  estimate_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Setup Realtime Sync
-- (Already executed in your backend; re-running this triggers 42710 errors)
-- BEGIN;
--   DROP PUBLICATION IF EXISTS supabase_realtime;
--   CREATE PUBLICATION supabase_realtime;
-- COMMIT;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE participants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE stories;
-- ALTER PUBLICATION supabase_realtime ADD TABLE votes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE board_tasks;

-- ============================================================
-- v0.2 Migration — run in Supabase SQL Editor on existing DBs
-- ============================================================
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS average_vote NUMERIC;
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS suggested_estimate TEXT;
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS revealed_votes JSONB;
-- (final_estimate already exists from v0.1 — no change needed)

-- ============================================================
-- Security: Row Level Security (RLS) Custom Session Scoped Policies
-- ============================================================
-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_tasks ENABLE ROW LEVEL SECURITY;

-- Helper function to extract session ID from our custom JWT
CREATE OR REPLACE FUNCTION get_app_session_id() RETURNS uuid AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'app_session_id', '')::uuid;
$$ LANGUAGE SQL STABLE;

-- 1. Sessions: 
-- Anyone can CREATE a session (insert), but they can only READ/UPDATE/DELETE if their JWT contains the matching session ID.
CREATE POLICY "Allow public insert sessions" ON sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow scoped select sessions" ON sessions FOR SELECT TO public USING (id = get_app_session_id());
CREATE POLICY "Allow scoped update sessions" ON sessions FOR UPDATE TO public USING (id = get_app_session_id()) WITH CHECK (id = get_app_session_id());
CREATE POLICY "Allow scoped delete sessions" ON sessions FOR DELETE TO public USING (id = get_app_session_id());

-- 2. Scoped Tables (Participants, Stories, Votes, Board Tasks)
-- All operations are strictly scoped to the session ID in the token.
CREATE POLICY "Allow scoped all participants" ON participants FOR ALL TO public USING (session_id = get_app_session_id()) WITH CHECK (session_id = get_app_session_id());
CREATE POLICY "Allow scoped all stories" ON stories FOR ALL TO public USING (session_id = get_app_session_id()) WITH CHECK (session_id = get_app_session_id());
CREATE POLICY "Allow scoped all votes" ON votes FOR ALL TO public USING (session_id = get_app_session_id()) WITH CHECK (session_id = get_app_session_id());
CREATE POLICY "Allow scoped all board_tasks" ON board_tasks FOR ALL TO public USING (session_id = get_app_session_id()) WITH CHECK (session_id = get_app_session_id());
