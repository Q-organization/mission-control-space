ALTER TABLE notion_planets ADD COLUMN IF NOT EXISTS seen_by JSONB DEFAULT '{}'::jsonb;
