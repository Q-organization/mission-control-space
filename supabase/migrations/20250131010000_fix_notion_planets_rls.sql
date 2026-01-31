-- Fix RLS policies for notion_planets table

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read notion planets" ON notion_planets;
DROP POLICY IF EXISTS "Service role can insert notion planets" ON notion_planets;
DROP POLICY IF EXISTS "Anyone can update notion planets" ON notion_planets;

-- Create permissive policies that work with anon role
CREATE POLICY "Enable read access for all users" ON notion_planets
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON notion_planets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON notion_planets
  FOR UPDATE USING (true);
