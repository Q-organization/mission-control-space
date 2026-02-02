-- Create notion_user_mappings table to link Notion users to game players
CREATE TABLE IF NOT EXISTS notion_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  notion_user_id TEXT NOT NULL,
  notion_user_name TEXT, -- For reference only
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, notion_user_id),
  UNIQUE(team_id, player_id)
);

-- Enable RLS
ALTER TABLE notion_user_mappings ENABLE ROW LEVEL SECURITY;

-- Allow read access
CREATE POLICY "Allow read access to notion_user_mappings"
  ON notion_user_mappings FOR SELECT
  USING (true);

-- Allow service role full access (for edge functions)
CREATE POLICY "Allow service role full access to notion_user_mappings"
  ON notion_user_mappings FOR ALL
  USING (auth.role() = 'service_role');
