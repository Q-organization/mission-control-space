# Voice AI System

## Overview

Dynamic AI-generated voice lines that play during gameplay. Uses OpenAI GPT-4o-mini to generate short witty text, then ElevenLabs Flash v2.5 to speak it. Currently used for the launch greeting — designed to be extended to other game moments.

## Architecture

```
Frontend (VoiceService.ts)
  ├── Builds context from game state (no extra queries)
  ├── Calls Supabase Edge Function (voice-greeting)
  │     └── Calls OpenAI GPT-4o-mini → returns text
  ├── Sends text to ElevenLabs API (direct, supports CORS)
  └── Plays audio blob
```

**Why the edge function?** OpenAI's API blocks browser CORS requests. The edge function proxies the call and keeps the API key server-side.

## Key Files

| File | Purpose |
|------|---------|
| `src/services/VoiceService.ts` | Client-side service — context building, edge function call, ElevenLabs TTS, audio playback |
| `supabase/functions/voice-greeting/index.ts` | Edge function — system prompt, random title injection, OpenAI call |

## How It Works

### 1. Context Gathering (Frontend)

When the player clicks "Launch Mission", `VoiceService.greet()` is called with a `GreetingContext` built from already-loaded data:

- **playerName** — display name
- **playerRank** — position on leaderboard (1-indexed)
- **totalPlayers** — how many players total
- **currencyPoints** — spendable credits (not lifetime earned)
- **leaderName / pointsGap** — who's #1 and how far ahead (if not current player)
- **onlinePlayers** — other players currently in-game

This gets turned into a plain text user message like:
```
Quentin, rank #2 of 5. Armel leads, 250 pts ahead. Has 85 credits to spend. Online: Alex, Milya.
```

### 2. Text Generation (Edge Function)

The edge function:
1. Picks a random title from a list (Captain, Pilot, Star Lord, Space Cowboy, etc.)
2. Prepends `Use title "X" for this player.` to the user message
3. Sends system prompt + user message to GPT-4o-mini (`temperature: 1.1`, `max_tokens: 60`)
4. Returns the generated text

**System prompt rules:**
- Use the provided title (not always "Commander")
- Don't start with "Welcome back" — vary openings
- Reference credits (1000+ = rich, under 100 = broke)
- Competitive nudges based on leaderboard position
- Max 15 words

### 3. Text-to-Speech (Frontend → ElevenLabs)

Direct browser call to ElevenLabs (CORS supported):
- Voice: `CwhRBWXzGAHq8TQ4Fs17` (Roger)
- Model: `eleven_flash_v2_5`
- Format: `mp3_22050_32`
- Plays via `new Audio(blobUrl)`

## Timing

Typical end-to-end: ~800-1200ms
- Edge function + OpenAI: ~400-600ms
- ElevenLabs TTS: ~300-500ms
- First call after idle adds ~150ms cold start

## API Keys

| Service | Key Location |
|---------|-------------|
| OpenAI | Supabase secret `OPENAI_API_KEY` (never in frontend) |
| ElevenLabs | `VoiceService.ts` constant (CORS-safe, browser-callable) |

## Extending to Other Moments

The system is designed to be reused. To add voice to a new game event:

1. **Add a new system prompt** in the edge function (use a `mode` param to select it)
2. **Build context** from whatever game data is relevant
3. **Call the edge function** with `{ userMessage, mode: 'your-mode' }`
4. The TTS pipeline is shared

### Ideas Explored / Shelved

- **Task landing comments** — witty reaction when opening a notion planet. Removed because it felt overwhelming with voice on every planet click.

### Potential Future Triggers

- Completing a task (celebration line)
- Another player overtaking on leaderboard
- Purchasing a ship upgrade
- Entering another player's zone
- Idle for too long (nudge to get back to work)

## Deployment

```bash
# Update the edge function
npx supabase functions deploy voice-greeting --no-verify-jwt

# Update OpenAI key if needed
npx supabase secrets set 'OPENAI_API_KEY=sk-...'
```

## Debug Logging

VoiceService logs everything to console:
- `[Voice] Context:` — raw data object
- `[Voice] System prompt:` — full system prompt
- `[Voice] User message:` — text sent to OpenAI
- `[Voice] OpenAI: Xms → "text"` — generated line + timing
- `[Voice] ElevenLabs: Xms` — TTS timing
- `[Voice] Total: Xms` — end-to-end
