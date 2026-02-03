-- Add unique constraint on teams.name to prevent duplicate teams
-- This ensures only one team can exist with the same name

ALTER TABLE teams ADD CONSTRAINT teams_name_unique UNIQUE (name);
