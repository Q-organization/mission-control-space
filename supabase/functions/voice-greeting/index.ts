const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const TITLES = [
  'Captain', 'Pilot', 'Admiral', 'Star Lord', 'Space Cowboy',
  'Cadet', 'Astronaut', 'Navigator', 'Chief', 'Legend',
  'Starship Captain', 'Ace', 'Rookie', 'Big Boss', 'Cosmonaut',
];

const GREETING_PROMPT = `You are a ship AI greeting a player returning to their spaceship in a multiplayer space game. Generate ONE short welcome line (max 15 words).

Rules:
- IMPORTANT: Address the player using EXACTLY the title provided in the prompt. Do NOT use "Commander" — use the title given.
- IMPORTANT: ALWAYS include the player's actual name in the greeting. Use the title + name combo like "Captain Quentin" or just their name naturally in the sentence.
- IMPORTANT: Do NOT start with "Welcome back". Vary your opening — jump straight into something fun, dramatic, or weird. Examples of good openings: "Lock and load,", "Well well well,", "Engines hot,", "Look who finally showed up —", "Strap in,", "The legend returns!", "Hey", "Yo", etc.
- Be encouraging, fun, and space-themed
- If they're #1, hype them up. If someone else leads, playful competitive nudge
- Credits context: 1000+ is rich (joke about wealth), 500 is decent, a few hundred is not much, under 100 is broke (tease them)
- Keep it varied — sometimes dramatic, sometimes chill, sometimes funny
- Output ONLY the greeting line, nothing else`;

const UPGRADE_REACT_PROMPT = `You are a sarcastic ship AI mechanic. A player just submitted a customization request for their ship or planet. React to what they asked for with ONE short line (max 15 words).

Rules:
- Be sarcastic, witty, or playfully skeptical about their choice
- React specifically to WHAT they asked for — if it's silly (donuts, cats, etc.), roast it. If it's cool (laser cannons, flames), act impressed but still snarky
- For ship upgrades: you're the mechanic getting the work order
- For planet upgrades (terraform): you're the architect hearing the request
- Think: "Donuts, huh? Bold choice for deep space." or "Flame decals? What is this, a space minivan?"
- Output ONLY the reaction line, nothing else`;

const UPGRADE_REVIEW_PROMPT = `You are a sarcastic ship AI reviewing the result of a customization job. You're looking at the generated image and comparing it to what the player originally asked for.

You will receive:
1. The player's original prompt (what they wanted)
2. The actual image (what the AI generated)

Generate ONE short, funny reaction (max 20 words) based on how well the result matches:
- If it looks close to what they asked: impressed but still snarky — "Not bad, actually looks like what you asked for. Miracle."
- If it's somewhat close: backhanded compliment — "Well, if you squint... I can kinda see it."
- If it's way off: roast them — "That looks nothing like what you asked for. Maybe learn to prompt better?"
- Always be specific about what you see vs what they wanted
- Tease the player, not the AI — it's THEIR prompting skills on trial
- Output ONLY the reaction line, nothing else`;

async function callOpenAI(systemPrompt: string, userContent: unknown, maxTokens = 60) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(typeof userContent === 'string'
      ? [{ role: 'user', content: userContent }]
      : [{ role: 'user', content: userContent }]),
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 1.1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('OpenAI error:', res.status, body);
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userMessage, mode, imageUrl } = await req.json();

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing userMessage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENAI_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let text: string | null = null;

    if (mode === 'upgrade_react') {
      // Sarcastic reaction to the player's prompt
      text = await callOpenAI(UPGRADE_REACT_PROMPT, userMessage);

    } else if (mode === 'upgrade_review' && imageUrl) {
      // Vision-based review: compare image to original prompt
      const visionContent = [
        { type: 'text', text: `The player asked for: ${userMessage}\n\nHere's what the AI generated. How close is it to what they wanted?` },
        { type: 'image_url', image_url: { url: imageUrl } },
      ];
      text = await callOpenAI(UPGRADE_REVIEW_PROMPT, visionContent, 80);

    } else {
      // Default: greeting
      const title = TITLES[Math.floor(Math.random() * TITLES.length)];
      const fullMessage = `Use title "${title}" for this player.\n\n${userMessage}`;
      text = await callOpenAI(GREETING_PROMPT, fullMessage);
    }

    return new Response(
      JSON.stringify({ text: text || '' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
