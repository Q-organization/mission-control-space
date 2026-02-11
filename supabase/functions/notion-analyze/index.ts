// Notion Analyze - Triggers deep analysis for a planet on demand
// Called from the game UI when a user clicks "Run Analysis"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format UUID with dashes
function formatUuidWithDashes(id: string): string {
  const normalized = id.replace(/-/g, '').toLowerCase();
  if (normalized.length !== 32) return id;
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notion_planet_id } = await req.json();

    if (!notion_planet_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: notion_planet_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the planet data
    const { data: planet, error: planetError } = await supabase
      .from('notion_planets')
      .select('id, name, description, task_type, priority, notion_task_id, deep_analysis, analysis_status')
      .eq('id', notion_planet_id)
      .single();

    if (planetError || !planet) {
      return new Response(
        JSON.stringify({ error: 'Planet not found', details: planetError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already analyzing
    if (planet.analysis_status === 'pending') {
      return new Response(
        JSON.stringify({ success: true, action: 'already_pending', planet_name: planet.name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger GitHub Actions
    const githubPat = Deno.env.get('GITHUB_PAT');
    if (!githubPat) {
      return new Response(
        JSON.stringify({ error: 'GITHUB_PAT not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      'https://api.github.com/repos/Q-organization/mission-control-space/actions/workflows/analyze-task.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubPat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            task_title: planet.name,
            task_description: planet.description || '',
            task_type: planet.task_type || '',
            task_priority: planet.priority || '',
            notion_planet_id: planet.id,
            notion_task_id: formatUuidWithDashes(planet.notion_task_id),
          },
        }),
      }
    );

    if (response.status !== 204) {
      const errorText = await response.text();
      console.error(`Failed to trigger analysis: ${response.status} ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to trigger analysis', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set status to pending on all planets for this task
    await supabase
      .from('notion_planets')
      .update({ analysis_status: 'pending', auto_analyze: true })
      .eq('notion_task_id', planet.notion_task_id);

    console.log(`Triggered on-demand analysis for "${planet.name}" (planet ${planet.id})`);

    return new Response(
      JSON.stringify({
        success: true,
        action: 'triggered',
        planet_name: planet.name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analyze error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
