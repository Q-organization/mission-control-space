// Notion Page - Fetches a specific page to debug user assignment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page_id } = await req.json();

    if (!page_id) {
      return new Response(
        JSON.stringify({ error: 'page_id required' }),
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

    const response = await fetch(`https://api.notion.com/v1/pages/${page_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: 'Failed to fetch page', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const page = await response.json();

    // Extract relevant user info
    const props = page.properties;
    const attributedTo = props['Attributed to']?.people || [];
    const createdBy = page.created_by;

    return new Response(
      JSON.stringify({
        page_id: page.id,
        title: props['Ticket']?.title?.[0]?.plain_text || 'Unknown',
        attributed_to: attributedTo.map((p: any) => ({
          id: p.id,
          name: p.name,
          email: p.person?.email,
        })),
        created_by: {
          id: createdBy?.id,
          name: createdBy?.name,
        },
        raw_attributed_to: attributedTo,
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
