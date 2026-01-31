// Notion Webhook Handler for Mission Control Space
// Receives webhooks from Notion when tasks are created/updated and creates planets in the game

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notion-secret',
};

interface NotionWebhookPayload {
  // Notion task data
  id: string;
  name: string;
  description?: string;
  type?: string; // bug, feature, epic, etc.
  points?: number; // Custom points property
  assigned_to?: string; // Username of assigned person
  status?: string;
  url?: string;
}

interface PointConfig {
  source: string;
  task_type: string;
  points: number;
}

// Player zone positions (must match SpaceGame.ts)
const CENTER_X = 5000;
const CENTER_Y = 5000;
const PLAYER_DISTANCE = 3000;

const PLAYER_ZONES: Record<string, { x: number; y: number }> = {
  'quentin': { x: CENTER_X + PLAYER_DISTANCE, y: CENTER_Y }, // Right
  'alex': { x: CENTER_X + PLAYER_DISTANCE * 0.7, y: CENTER_Y - PLAYER_DISTANCE * 0.7 }, // Top-Right
  'armel': { x: CENTER_X, y: CENTER_Y - PLAYER_DISTANCE }, // Top
  'melia': { x: CENTER_X - PLAYER_DISTANCE * 0.7, y: CENTER_Y - PLAYER_DISTANCE * 0.7 }, // Top-Left
  'hugue': { x: CENTER_X - PLAYER_DISTANCE, y: CENTER_Y }, // Left
};

// Default zone for unassigned tasks
const DEFAULT_ZONE = { x: CENTER_X, y: CENTER_Y + 500 }; // Below center

function getRandomOffset(range: number): number {
  return (Math.random() - 0.5) * range;
}

function getPlanetPosition(assignedTo: string | null | undefined): { x: number; y: number } {
  const baseZone = assignedTo && PLAYER_ZONES[assignedTo.toLowerCase()]
    ? PLAYER_ZONES[assignedTo.toLowerCase()]
    : DEFAULT_ZONE;

  // Add random offset within the zone (spread planets around)
  return {
    x: baseZone.x + getRandomOffset(800),
    y: baseZone.y + getRandomOffset(800),
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const notionSecret = req.headers.get('x-notion-secret');
    const expectedSecret = Deno.env.get('NOTION_WEBHOOK_SECRET');

    if (!expectedSecret) {
      console.error('NOTION_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (notionSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook payload
    const payload: NotionWebhookPayload = await req.json();
    console.log('Received Notion webhook:', JSON.stringify(payload));

    // Validate required fields
    if (!payload.id || !payload.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: id and name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicate planet (idempotency)
    const { data: existingPlanet } = await supabase
      .from('notion_planets')
      .select('id')
      .eq('notion_task_id', payload.id)
      .single();

    if (existingPlanet) {
      console.log('Planet already exists for task:', payload.id);
      return new Response(
        JSON.stringify({ message: 'Planet already exists', task_id: payload.id, planet_id: existingPlanet.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get point configuration for this task type
    let points = payload.points; // Use custom points if provided

    if (!points) {
      // Look up points from config
      const taskType = payload.type?.toLowerCase() || 'default';
      const { data: config } = await supabase
        .from('point_config')
        .select('points')
        .eq('source', 'notion')
        .eq('task_type', taskType)
        .single();

      if (config) {
        points = config.points;
      } else {
        // Fallback to default
        const { data: defaultConfig } = await supabase
          .from('point_config')
          .select('points')
          .eq('source', 'notion')
          .eq('task_type', 'default')
          .single();

        points = defaultConfig?.points || 30;
      }
    }

    // Find the team
    const { data: teams } = await supabase
      .from('teams')
      .select('id, team_points')
      .limit(1);

    if (!teams || teams.length === 0) {
      console.error('No teams found');
      return new Response(
        JSON.stringify({ error: 'No team configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const team = teams[0];

    // Calculate planet position based on assigned user
    const position = getPlanetPosition(payload.assigned_to);

    // Create the planet
    const { data: planet, error: planetError } = await supabase
      .from('notion_planets')
      .insert({
        team_id: team.id,
        notion_task_id: payload.id,
        name: payload.name,
        description: payload.description || null,
        notion_url: payload.url || null,
        assigned_to: payload.assigned_to?.toLowerCase() || null,
        task_type: payload.type || null,
        points: points,
        x: Math.round(position.x),
        y: Math.round(position.y),
        completed: false,
      })
      .select()
      .single();

    if (planetError) {
      console.error('Failed to create planet:', planetError);
      return new Response(
        JSON.stringify({ error: 'Failed to create planet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created planet "${payload.name}" at (${position.x}, ${position.y}) for ${payload.assigned_to || 'unassigned'}`);

    return new Response(
      JSON.stringify({
        success: true,
        planet_id: planet.id,
        planet_name: payload.name,
        assigned_to: payload.assigned_to || null,
        position: position,
        points: points,
        notion_url: payload.url || null,
        team_id: team.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
