// Notion Complete Handler - Updates Notion task status when planet is completed in-game

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteRequest {
  notion_planet_id: string; // Our database ID (not the notion task ID)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { notion_planet_id }: CompleteRequest = body;

    console.log('=== NOTION-COMPLETE CALLED ===');
    console.log('Request body:', JSON.stringify(body));
    console.log('notion_planet_id:', notion_planet_id);

    if (!notion_planet_id) {
      return new Response(
        JSON.stringify({ error: 'Missing notion_planet_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the notion task ID and other data from our database
    const { data: planet, error: fetchError } = await supabase
      .from('notion_planets')
      .select('notion_task_id, name, completed, assigned_to, points, team_id')
      .eq('id', notion_planet_id)
      .single();

    if (fetchError || !planet) {
      console.log('Planet not found. Error:', fetchError?.message);
      return new Response(
        JSON.stringify({ error: 'Planet not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found planet:', planet.name);
    console.log('Notion task ID:', planet.notion_task_id);
    console.log('Assigned to:', planet.assigned_to);
    console.log('Points:', planet.points);
    console.log('Already completed:', planet.completed);

    if (planet.completed) {
      console.log('Planet already completed, skipping Notion update');
      return new Response(
        JSON.stringify({ message: 'Planet already completed', notion_task_id: planet.notion_task_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Notion API token
    const notionToken = Deno.env.get('NOTION_API_TOKEN');
    if (!notionToken) {
      console.error('NOTION_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Notion API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update Notion page status to "Archived"
    // Try "select" type first (Status field is a Select), fall back to "status" type
    console.log('Calling Notion API to set status to Archived...');
    let notionResponse = await fetch(`https://api.notion.com/v1/pages/${planet.notion_task_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        properties: {
          'Status': {
            select: {
              name: 'Archived',
            },
          },
        },
      }),
    });

    console.log('Notion API response status:', notionResponse.status);

    // If select type failed, try status type (in case field type changes)
    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.log('Notion API error:', errorText);
      if (errorText.includes('select') || errorText.includes('validation')) {
        console.log('Select type failed, trying status type...');
        notionResponse = await fetch(`https://api.notion.com/v1/pages/${planet.notion_task_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            properties: {
              'Status': {
                status: {
                  name: 'Archived',
                },
              },
            },
          }),
        });
      }
    }

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error:', errorText);

      // Still mark as completed in our database even if Notion fails
      await supabase
        .from('notion_planets')
        .update({ completed: true })
        .eq('id', notion_planet_id);

      return new Response(
        JSON.stringify({
          warning: 'Planet marked complete locally but Notion update failed',
          notion_error: errorText,
          notion_task_id: planet.notion_task_id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as completed in our database
    const { error: updateError } = await supabase
      .from('notion_planets')
      .update({ completed: true })
      .eq('id', notion_planet_id);

    if (updateError) {
      console.error('Failed to update local database:', updateError);
    }

    // Award points to the assigned player
    const points = planet.points || 30; // Default to 30 if not set
    if (planet.assigned_to && planet.team_id) {
      // Find player by username (case-insensitive)
      const { data: player } = await supabase
        .from('players')
        .select('id, username, personal_points')
        .eq('team_id', planet.team_id)
        .ilike('username', planet.assigned_to)
        .single();

      if (player) {
        // Check if points were already awarded for this task (avoid duplicates)
        const { data: existingTransaction } = await supabase
          .from('point_transactions')
          .select('id')
          .eq('notion_task_id', planet.notion_task_id)
          .eq('player_id', player.id)
          .ilike('task_name', `Completed:%`)
          .single();

        if (!existingTransaction) {
          // Create point transaction
          await supabase.from('point_transactions').insert({
            team_id: planet.team_id,
            player_id: player.id,
            source: 'notion',
            notion_task_id: planet.notion_task_id,
            task_name: `Completed: ${planet.name}`,
            points: points,
            point_type: 'personal',
          });

          // Update player's personal points
          await supabase
            .from('players')
            .update({ personal_points: (player.personal_points || 0) + points })
            .eq('id', player.id);

          console.log(`Awarded ${points} personal points to ${player.username} for completing "${planet.name}"`);
        } else {
          console.log(`Points already awarded to ${player.username} for "${planet.name}" - skipping duplicate`);
        }
      } else {
        console.log(`Could not find player "${planet.assigned_to}" in team ${planet.team_id} - skipping point award`);
      }
    } else {
      console.log(`No assigned player or team_id for planet "${planet.name}" - skipping point award`);
    }

    console.log(`Completed planet "${planet.name}" and updated Notion status to Archived`);

    return new Response(
      JSON.stringify({
        success: true,
        notion_task_id: planet.notion_task_id,
        planet_name: planet.name,
        notion_status: 'Archived',
        points_awarded: points,
        awarded_to: planet.assigned_to || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Complete error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
