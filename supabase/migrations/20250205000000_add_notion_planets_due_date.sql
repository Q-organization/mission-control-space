-- Add due_date column to notion_planets for Notion "Due Date" property
ALTER TABLE notion_planets ADD COLUMN IF NOT EXISTS due_date DATE;
