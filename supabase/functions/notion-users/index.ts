// Notion Users - Fetches all users from Notion for mapping setup
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTION_DATABASE_ID = '2467d5a8-0344-8198-a604-c6bd91473887';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notionToken = Deno.env.get('NOTION_API_TOKEN');
    if (!notionToken) {
      return new Response(
        JSON.stringify({ error: 'NOTION_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all users from Notion workspace
    const usersResponse = await fetch('https://api.notion.com/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const usersData = usersResponse.ok ? await usersResponse.json() : { results: [] };

    // Also fetch from database to get users who appear in tasks but aren't workspace members
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ page_size: 100 }),
    });

    const dbData = dbResponse.ok ? await dbResponse.json() : { results: [] };

    // Collect all users from both sources
    const usersMap = new Map<string, { id: string; name: string; email: string | null; type: string; source: string }>();

    // Add workspace members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const user of (usersData.results || [])) {
      usersMap.set(user.id, {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.person?.email || null,
        type: user.type,
        source: 'workspace',
      });
    }

    // Add users from task assignments - log all people found
    const taskAssignments: { taskName: string; personId: string; personName: string }[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const page of (dbData.results || [])) {
      const props = page.properties;

      // Get task name
      let taskName = '';
      if (props['Ticket']?.title?.[0]?.plain_text) {
        taskName = props['Ticket'].title[0].plain_text;
      }

      // From "Attributed to" (assigned)
      if (props['Attributed to']?.people) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const person of props['Attributed to'].people) {
          taskAssignments.push({
            taskName,
            personId: person.id || 'no-id',
            personName: person.name || 'no-name',
          });

          if (person.id && !usersMap.has(person.id)) {
            usersMap.set(person.id, {
              id: person.id,
              name: person.name || 'Unknown',
              email: person.person?.email || null,
              type: 'person',
              source: 'task_assignment',
            });
          }
        }
      }

      // From created_by
      if (page.created_by?.id && !usersMap.has(page.created_by.id)) {
        usersMap.set(page.created_by.id, {
          id: page.created_by.id,
          name: page.created_by.name || 'Unknown',
          email: null,
          type: 'person',
          source: 'task_creator',
        });
      }
    }

    const notionUsers = Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Also get game players for easy mapping
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: players } = await supabase
      .from('players')
      .select('id, username')
      .order('username');

    const { data: existingMappings } = await supabase
      .from('notion_user_mappings')
      .select('notion_user_id, player_id, notion_user_name, players(username)');

    return new Response(
      JSON.stringify({
        notion_users: notionUsers,
        task_assignments: taskAssignments,
        game_players: players || [],
        existing_mappings: existingMappings || [],
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
