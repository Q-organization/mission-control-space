-- Add Alex mapping
INSERT INTO notion_user_mappings (team_id, player_id, notion_user_id, notion_user_name)
VALUES ('4bc8a5bd-29f7-4c79-a88e-f7ed650f8784', 'd5f96a77-3f03-460e-b41a-7f4af82db37d', '5cefae83-f090-4732-a386-4086e3bc60ba', 'A. Plas')
ON CONFLICT (team_id, notion_user_id) DO NOTHING;
