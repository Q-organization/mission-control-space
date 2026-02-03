// Notion Update Status - Updates a Notion page's status (archive, destroy, etc.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { planet_id, action } = body;

    console.log('=== NOTION-UPDATE-STATUS CALLED ===');
    console.log('Request body:', JSON.stringify(body));
    console.log('planet_id:', planet_id);
    console.log('action:', action);

    if (!planet_id) {
      return new Response(
        JSON.stringify({ error: 'planet_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !['archive', 'destroy'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'action must be "archive" or "destroy"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notionToken = Deno.env.get('NOTION_API_TOKEN');
    if (!notionToken) {
      return new Response(
        JSON.stringify({ error: 'NOTION_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the notion_task_id from our database
    const { data: planet, error: fetchError } = await supabase
      .from('notion_planets')
      .select('notion_task_id, name')
      .eq('id', planet_id)
      .single();

    if (fetchError || !planet) {
      console.log('Planet not found in DB. Error:', fetchError?.message);
      return new Response(
        JSON.stringify({ error: 'Planet not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found planet:', planet.name);
    console.log('Notion task ID:', planet.notion_task_id);

    // Track if we successfully updated Notion (for logging purposes)
    let notionUpdateSucceeded = false;

    // Only try to update Notion if we have a valid notion_task_id
    if (planet.notion_task_id) {
      // Prepare Notion update based on action
      // Using "select" type since the Status property is a Select field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        properties: {},
      };

      if (action === 'archive') {
        updatePayload.properties['Status'] = {
          select: { name: 'Archived' },
        };
      } else if (action === 'destroy') {
        updatePayload.properties['Status'] = {
          select: { name: 'Destroyed' },
        };
      }

      console.log('Update payload:', JSON.stringify(updatePayload));
      console.log('Calling Notion API to update page:', planet.notion_task_id);

      try {
        const notionResponse = await fetch(`https://api.notion.com/v1/pages/${planet.notion_task_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify(updatePayload),
        });

        console.log('Notion API response status:', notionResponse.status);

        if (notionResponse.ok) {
          notionUpdateSucceeded = true;
        } else {
          const errorText = await notionResponse.text();
          console.error('Notion API error:', errorText);

          // If "Destroyed" option doesn't exist, try archiving the page instead
          if (action === 'destroy' && (errorText.includes('Destroyed') || errorText.includes('is not a valid option'))) {
            console.log('Destroyed option not found, archiving page instead...');
            const archiveResponse = await fetch(`https://api.notion.com/v1/pages/${planet.notion_task_id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28',
              },
              body: JSON.stringify({ archived: true }),
            });
            notionUpdateSucceeded = archiveResponse.ok;
            if (!notionUpdateSucceeded) {
              console.error('Archive fallback also failed:', await archiveResponse.text());
            }
          } else {
            // Log the error but continue - we'll still clean up our local DB
            console.log('Notion update failed, but proceeding to clean up local DB anyway');
          }
        }
      } catch (notionError) {
        console.error('Notion API call threw error:', notionError);
        // Continue anyway - clean up local DB
      }
    } else {
      console.log('No notion_task_id, skipping Notion update');
    }

    // Update our database based on action
    if (action === 'archive') {
      // Mark as completed in our DB (this was already done, but ensure it's set)
      await supabase
        .from('notion_planets')
        .update({ completed: true })
        .eq('id', planet_id);
    } else if (action === 'destroy') {
      // Delete from our database (planet is destroyed, gone from game)
      await supabase
        .from('notion_planets')
        .delete()
        .eq('id', planet_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        planet_name: planet.name,
        notion_task_id: planet.notion_task_id,
        notion_updated: notionUpdateSucceeded,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
