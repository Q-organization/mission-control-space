// Notion Reassign - Allows changing the owner of an assigned task
// Updates assigned_to and moves the planet to the new player's zone

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReassignRequest {
  notion_planet_id: string; // Our database ID (not the notion task ID)
  new_owner_username: string;  // Username of the new owner
}

interface ExistingPlanet {
  x: number;
  y: number;
}

// Player zone positions (must match SpaceGame.ts)
const CENTER_X = 5000;
const CENTER_Y = 5000;
const PLAYER_DISTANCE = 3000;
const HUB_DISTANCE = 2800;

// Mission Control position (bottom middle)
const MISSION_CONTROL_X = CENTER_X;
const MISSION_CONTROL_Y = CENTER_Y + HUB_DISTANCE * 1.1;

const PLAYER_ZONES: Record<string, { x: number; y: number }> = {
  'quentin': { x: CENTER_X + PLAYER_DISTANCE, y: CENTER_Y },
  'alex': { x: CENTER_X + PLAYER_DISTANCE * 0.7, y: CENTER_Y - PLAYER_DISTANCE * 0.7 },
  'armel': { x: CENTER_X, y: CENTER_Y - PLAYER_DISTANCE },
  'milya': { x: CENTER_X - PLAYER_DISTANCE * 0.7, y: CENTER_Y - PLAYER_DISTANCE * 0.7 },
  'hugues': { x: CENTER_X - PLAYER_DISTANCE, y: CENTER_Y },
};

const PLANET_RADIUS = 50;
const MIN_DISTANCE = PLANET_RADIUS * 3;

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function findNonOverlappingPosition(
  assignedTo: string,
  existingPlanets: ExistingPlanet[]
): { x: number; y: number } {
  const baseZone = PLAYER_ZONES[assignedTo.toLowerCase()];
  if (!baseZone) {
    // Unknown player, place near Mission Control
    return { x: MISSION_CONTROL_X, y: MISSION_CONTROL_Y };
  }

  const allObstacles: ExistingPlanet[] = [
    ...existingPlanets,
    { x: baseZone.x, y: baseZone.y },
  ];

  const maxAttempts = 50;

  // Tight rings around home planet
  const baseRadius = 380;
  const ringSpacing = 100;
  const angleStep = 0.7;
  const planetsPerRing = 9;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ring = Math.floor(attempt / planetsPerRing);
    const slotInRing = attempt % planetsPerRing;
    const radius = baseRadius + ring * ringSpacing;
    const angle = slotInRing * angleStep + (ring * 0.35);

    const radiusJitter = (Math.random() - 0.5) * 40;
    const angleJitter = (Math.random() - 0.5) * 0.1;

    const candidate = {
      x: baseZone.x + Math.cos(angle + angleJitter) * (radius + radiusJitter),
      y: baseZone.y + Math.sin(angle + angleJitter) * (radius + radiusJitter),
    };

    let isValid = true;
    for (const planet of allObstacles) {
      if (distance(candidate, planet) < MIN_DISTANCE) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      return candidate;
    }
  }

  // Fallback: outer rings
  const fallbackRing = 2 + Math.floor(Math.random() * 3);
  const fallbackRadius = baseRadius + fallbackRing * ringSpacing;
  const fallbackAngle = Math.random() * Math.PI * 2;
  return {
    x: baseZone.x + Math.cos(fallbackAngle) * fallbackRadius,
    y: baseZone.y + Math.sin(fallbackAngle) * fallbackRadius,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notion_planet_id, new_owner_username }: ReassignRequest = await req.json();

    if (!notion_planet_id || !new_owner_username) {
      return new Response(
        JSON.stringify({ error: 'Missing notion_planet_id or new_owner_username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the planet
    const { data: planet, error: fetchError } = await supabase
      .from('notion_planets')
      .select('id, team_id, notion_task_id, name, assigned_to, completed')
      .eq('id', notion_planet_id)
      .single();

    if (fetchError || !planet) {
      return new Response(
        JSON.stringify({ error: 'Planet not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if completed
    if (planet.completed) {
      return new Response(
        JSON.stringify({ error: 'Cannot reassign completed task' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing planets in the new owner's zone to avoid overlaps
    const { data: existingPlanets } = await supabase
      .from('notion_planets')
      .select('x, y')
      .eq('team_id', planet.team_id)
      .ilike('assigned_to', new_owner_username);

    // Calculate new position in player's zone
    const newPosition = findNonOverlappingPosition(
      new_owner_username,
      existingPlanets || []
    );

    const previousOwner = planet.assigned_to;

    // Update the planet
    const { error: updateError } = await supabase
      .from('notion_planets')
      .update({
        assigned_to: new_owner_username.toLowerCase(),
        x: Math.round(newPosition.x),
        y: Math.round(newPosition.y),
      })
      .eq('id', notion_planet_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update planet', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also update Notion to set "Attributed to" field
    const notionToken = Deno.env.get('NOTION_API_TOKEN');
    if (notionToken) {
      try {
        // Fetch Notion workspace users to find the matching user ID
        const usersResponse = await fetch('https://api.notion.com/v1/users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
          },
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          // Find user whose name matches (case-insensitive)
          const notionUser = usersData.results?.find((user: { name?: string; type: string }) =>
            user.type === 'person' &&
            user.name?.toLowerCase() === new_owner_username.toLowerCase()
          );

          if (notionUser) {
            // Update the Notion page with the "Attributed to" field
            const updateResponse = await fetch(`https://api.notion.com/v1/pages/${planet.notion_task_id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28',
              },
              body: JSON.stringify({
                properties: {
                  'Attributed to': {
                    people: [{ id: notionUser.id }],
                  },
                },
              }),
            });

            if (updateResponse.ok) {
              console.log(`Updated Notion task ${planet.notion_task_id} - reassigned to ${notionUser.name} (${notionUser.id})`);
            } else {
              const errorText = await updateResponse.text();
              console.error('Failed to update Notion page:', errorText);
            }
          } else {
            console.log(`Notion user not found for username: ${new_owner_username}`);
          }
        } else {
          console.error('Failed to fetch Notion users:', await usersResponse.text());
        }
      } catch (notionError) {
        console.error('Failed to update Notion:', notionError);
      }
    }

    console.log(`Task "${planet.name}" reassigned from ${previousOwner || 'unassigned'} to ${new_owner_username} - moved to (${newPosition.x}, ${newPosition.y})`);

    return new Response(
      JSON.stringify({
        success: true,
        planet_id: notion_planet_id,
        planet_name: planet.name,
        previous_owner: previousOwner,
        assigned_to: new_owner_username.toLowerCase(),
        new_position: newPosition,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reassign error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
