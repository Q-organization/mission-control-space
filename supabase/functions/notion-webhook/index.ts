// Notion Webhook Handler for Mission Control Space
// Receives webhooks from Notion when tasks are completed and awards points to the team

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notion-secret',
};

interface NotionWebhookPayload {
  // Notion task data
  id: string;
  name: string;
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

    // Check for duplicate (idempotency)
    const { data: existingTx } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('notion_task_id', payload.id)
      .single();

    if (existingTx) {
      console.log('Duplicate webhook for task:', payload.id);
      return new Response(
        JSON.stringify({ message: 'Already processed', task_id: payload.id }),
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

    // Find the team to award points to
    // For now, we'll award to the first/only team (single team setup)
    // In a multi-team setup, you'd need to pass team_id in the webhook or match by assigned user
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

    // Find player by username if assigned
    let playerId: string | null = null;
    if (payload.assigned_to) {
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', team.id)
        .ilike('username', payload.assigned_to)
        .single();

      if (player) {
        playerId = player.id;
      }
    }

    // Insert point transaction
    const { error: txError } = await supabase
      .from('point_transactions')
      .insert({
        team_id: team.id,
        player_id: playerId,
        source: 'notion',
        notion_task_id: payload.id,
        task_name: payload.name,
        points: points,
      });

    if (txError) {
      console.error('Failed to insert transaction:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to record points' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update team points
    const { error: updateError } = await supabase
      .from('teams')
      .update({ team_points: team.team_points + points })
      .eq('id', team.id);

    if (updateError) {
      console.error('Failed to update team points:', updateError);
      // Transaction was recorded, so we'll return partial success
    }

    console.log(`Awarded ${points} points to team ${team.id} for task: ${payload.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        points_awarded: points,
        task_id: payload.id,
        task_name: payload.name,
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
