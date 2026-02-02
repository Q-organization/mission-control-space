-- Fix RLS to allow authenticated users to insert mappings
DROP POLICY IF EXISTS "Allow service role full access to notion_user_mappings" ON notion_user_mappings;

-- Allow all operations for service role and authenticated users
CREATE POLICY "Allow all access to notion_user_mappings"
  ON notion_user_mappings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert initial mappings
INSERT INTO notion_user_mappings (team_id, player_id, notion_user_id, notion_user_name) VALUES
  ('4bc8a5bd-29f7-4c79-a88e-f7ed650f8784', '73dbbbe0-6602-4841-a47b-d89867e240d1', '69fdfd3e-72bd-4802-a02f-6aebf4f84c15', 'Armel'),
  ('4bc8a5bd-29f7-4c79-a88e-f7ed650f8784', '4fc1317b-497c-41b9-940e-78eef7e6d489', '6e5a124d-4278-4bcb-afe8-9a8ddc1b2ec3', 'Hugues TRIJASSE'),
  ('4bc8a5bd-29f7-4c79-a88e-f7ed650f8784', 'c90acdff-055e-4b1b-a011-d3fc7d4122e8', '2cad872b-594c-81e7-9a57-00028fca1385', 'Milya'),
  ('4bc8a5bd-29f7-4c79-a88e-f7ed650f8784', '447bf07d-7951-4fe3-84b3-5178e59b688f', '862882ce-50d2-4962-8600-401429fa03cf', 'Quentin')
ON CONFLICT (team_id, notion_user_id) DO NOTHING;
