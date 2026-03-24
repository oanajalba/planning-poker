-- Planning Poker & Board MVP Database Schema
-- Run this in your Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  v_app_version TEXT NOT NULL,
  name TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('poker', 'board')),
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'voting', 'revealed', 'board')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Participants Table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stories Table
CREATE TABLE stories (
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
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  UNIQUE(story_id, participant_id)
);

-- 5. Board Tasks Table
CREATE TABLE board_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  order_index INTEGER NOT NULL DEFAULT 0,
  estimate_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Setup Realtime Sync
BEGIN;
  -- Remove existing publication if necessary (uncomment if redefining)
  -- DROP PUBLICATION IF EXISTS supabase_realtime;
  -- CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE board_tasks;

-- ============================================================
-- v0.2 Migration — run in Supabase SQL Editor on existing DBs
-- ============================================================
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS average_vote NUMERIC;
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS suggested_estimate TEXT;
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS revealed_votes JSONB;
-- (final_estimate already exists from v0.1 — no change needed)
