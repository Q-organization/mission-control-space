# Multiplayer Setup Guide

## 1. Database Setup

Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor):

```sql
-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Mission Control Team',
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  team_points INTEGER DEFAULT 0,
  completed_planets TEXT[] DEFAULT '{}',
  goals JSONB DEFAULT '{"business":[],"product":[],"achievement":[]}'::jsonb,
  custom_planets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ffa500',
  ship_base_image TEXT DEFAULT '/ship-base.png',
  ship_current_image TEXT DEFAULT '/ship-base.png',
  ship_upgrades TEXT[] DEFAULT '{}',
  ship_effects JSONB DEFAULT '{"glowColor":null,"trailType":"default","sizeBonus":0,"speedBonus":0,"ownedGlows":[],"ownedTrails":[]}'::jsonb,
  planet_image_url TEXT DEFAULT '',
  planet_terraform_count INTEGER DEFAULT 0,
  planet_size_level INTEGER DEFAULT 0,
  planet_history JSONB DEFAULT '[]'::jsonb,
  mascot_history JSONB DEFAULT '[]'::jsonb,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, username)
);

-- Ship positions (separate for performance)
CREATE TABLE ship_positions (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  x FLOAT NOT NULL DEFAULT 5000,
  y FLOAT NOT NULL DEFAULT 5200,
  vx FLOAT DEFAULT 0,
  vy FLOAT DEFAULT 0,
  rotation FLOAT DEFAULT -1.5708,
  thrusting BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Point transactions (audit log)
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('planet', 'notion', 'manual')),
  notion_task_id TEXT UNIQUE,
  task_name TEXT,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Point config for task types
CREATE TABLE point_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  task_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  UNIQUE(source, task_type)
);

-- Insert defaults
INSERT INTO point_config (source, task_type, points) VALUES
  ('planet', 'small', 50),
  ('planet', 'medium', 100),
  ('planet', 'big', 200),
  ('notion', 'bug', 25),
  ('notion', 'feature', 50),
  ('notion', 'epic', 100),
  ('notion', 'default', 30);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE point_transactions;

-- Row Level Security (trust-based, no auth)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON ship_positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON point_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON point_config FOR SELECT USING (true);
```

## 2. Environment Variables

The `.env` file has been created with:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## 3. Notion Webhook Setup (Optional)

### Deploy the Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref qdizfhhsqolvuddoxugj

# Set the webhook secret
supabase secrets set NOTION_WEBHOOK_SECRET=your-secret-here

# Deploy the function
supabase functions deploy notion-webhook --no-verify-jwt
```

### Configure Notion

1. Open your tasks database in Notion
2. Go to **...** → **Automations**
3. Add trigger: **Status changed to "Done"**
4. Add action: **Send webhook**
5. Configure:
   - URL: `https://qdizfhhsqolvuddoxugj.supabase.co/functions/v1/notion-webhook`
   - Headers: `X-Notion-Secret: your-secret-here`
   - Body (JSON):
   ```json
   {
     "id": "{{page_id}}",
     "name": "{{Name}}",
     "type": "{{Type}}",
     "points": "{{Points}}",
     "assigned_to": "{{Assigned to}}"
   }
   ```

## 4. Testing

### Test Team Creation
1. Start the game: `npm run dev`
2. Click "👥 Multiplayer"
3. Enter a team name and click "Create Team"
4. Copy the invite link

### Test Team Joining
1. Open the game in another browser/incognito
2. Either:
   - Paste the invite link directly in the URL
   - Click "👥 Multiplayer" and enter the invite code

### Test Real-time Sync
1. Open two browsers as different users
2. Both should see each other's ships
3. Complete a planet in one browser - verify points sync to the other

### Test Notion Webhook
```bash
curl -X POST https://qdizfhhsqolvuddoxugj.supabase.co/functions/v1/notion-webhook \
  -H "Content-Type: application/json" \
  -H "X-Notion-Secret: your-secret-here" \
  -d '{"id":"test-123","name":"Test Task","type":"feature","points":50}'
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Browser 1     │     │   Browser 2     │
│  (Player A)     │     │  (Player B)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │   Supabase Realtime   │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │      Supabase         │
         │  ┌─────────────────┐  │
         │  │     Teams       │  │
         │  │    Players      │  │
         │  │ Ship Positions  │  │
         │  │  Transactions   │  │
         │  └─────────────────┘  │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   Notion Webhook      │
         │   (Edge Function)     │
         └───────────────────────┘
                     ▲
                     │
         ┌───────────┴───────────┐
         │    Notion Database    │
         │  (Task Completion)    │
         └───────────────────────┘
```

## Features

- **Real-time multiplayer**: See other players' ships in real-time
- **Team sharing**: Simple invite link to join a team
- **Synced progress**: Team points and completed planets sync across all players
- **Notion integration**: Automatically earn points when completing tasks in Notion
- **Point history**: Track who earned points and how
