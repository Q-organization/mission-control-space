-- Remove UNIQUE constraint on notion_task_id in point_transactions
-- This allows multiple transactions (Created, Completed) to reference the same Notion task
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_notion_task_id_key;
