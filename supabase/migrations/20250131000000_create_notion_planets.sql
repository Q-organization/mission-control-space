-- Create notion_planets table for storing planets created from Notion tasks
CREATE TABLE IF NOT EXISTS notion_planets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  notion_task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  notion_url TEXT,
  assigned_to TEXT,
  task_type TEXT,
  points INTEGER DEFAULT 30,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to prevent duplicate planets for the same Notion task
CREATE UNIQUE INDEX IF NOT EXISTS notion_planets_task_id_unique
ON notion_planets(notion_task_id);

-- Create index for team queries
CREATE INDEX IF NOT EXISTS notion_planets_team_id_idx
ON notion_planets(team_id);

-- Create index for assigned user queries
CREATE INDEX IF NOT EXISTS notion_planets_assigned_to_idx
ON notion_planets(assigned_to);

-- Enable Row Level Security
ALTER TABLE notion_planets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read notion planets
CREATE POLICY "Anyone can read notion planets"
ON notion_planets FOR SELECT
USING (true);

-- Policy: Authenticated users can insert (via webhook function)
CREATE POLICY "Service role can insert notion planets"
ON notion_planets FOR INSERT
WITH CHECK (true);

-- Policy: Authenticated users can update (mark as completed)
CREATE POLICY "Anyone can update notion planets"
ON notion_planets FOR UPDATE
USING (true);

-- Enable realtime for notion_planets
ALTER PUBLICATION supabase_realtime ADD TABLE notion_planets;
