// Notion Delete - Deletes a planet from the game database
// Used when manually destroying completed planets

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  planet_id: string; // Our database ID (UUID)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planet_id }: DeleteRequest = await req.json();

    if (!planet_id) {
      return new Response(
        JSON.stringify({ error: 'Missing planet_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the planet first to log its name
    const { data: planet } = await supabase
      .from('notion_planets')
      .select('name, notion_task_id')
      .eq('id', planet_id)
      .single();

    if (!planet) {
      return new Response(
        JSON.stringify({ error: 'Planet not found', planet_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the planet
    const { error: deleteError } = await supabase
      .from('notion_planets')
      .delete()
      .eq('id', planet_id);

    if (deleteError) {
      console.error('Failed to delete planet:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete planet', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleted planet: "${planet.name}" (${planet_id})`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_planet_id: planet_id,
        deleted_planet_name: planet.name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
