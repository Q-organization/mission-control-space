-- Add planet_base_image column to store the original base planet image
ALTER TABLE players ADD COLUMN IF NOT EXISTS planet_base_image TEXT;
