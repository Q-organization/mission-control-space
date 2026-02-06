# Voice AI System

## Overview

Dynamic AI-generated voice lines that play during gameplay. Uses OpenAI GPT-4o-mini to generate short witty text, then ElevenLabs Flash v2.5 to speak it. Two distinct voice characters: a ship AI (Roger) and a goblin shop merchant (Toby).

**Active triggers:**
- **Launch greeting** — personalized welcome when clicking "Launch Mission"
- **Shop merchant** — greedy goblin greets the player when entering the shop
- **Ship upgrade** — sarcastic reaction on submit + vision-based review of the result
- **Planet terraform** — same two-phase voice as ship upgrades

## Architecture

```
Frontend (VoiceService.ts)
  ├── Builds context from game state (no extra queries)
  ├── Calls Supabase Edge Function (voice-greeting)
  │     ├── mode: default → greeting with random title
  │     ├── mode: shop → greedy merchant greeting
  │     ├── mode: upgrade_react → sarcastic reaction to prompt
  │     └── mode: upgrade_review → OpenAI Vision compares image to prompt
  ├── Sends text to ElevenLabs API (direct, supports CORS)
  └── Plays audio blob
```

**Why the edge function?** OpenAI's API blocks browser CORS requests. The edge function proxies the call and keeps the API key server-side.

### Pre-generation for Faster Playback

To minimize perceived delay, voice lines are pre-generated in the background:

- **Shop greeting**: Starts generating when the player enters docking range of the shop (via `onShopApproach` callback from SpaceGame). By the time they land, audio is ready.
- **Upgrade review**: Starts generating right after background removal, in parallel with image saving. By the time the new ship/planet appears, audio is ready.

Methods: `prepareShopGreeting()` / `prepareUpgradeReview()` return audio blobs, played via `playBlob()` / `playShopGreeting()`.

## Key Files

| File | Purpose |
|------|---------|
| `src/services/VoiceService.ts` | Client-side service — context building, edge function call, ElevenLabs TTS, audio pre-generation, playback |
| `supabase/functions/voice-greeting/index.ts` | Edge function — system prompts, random title injection, OpenAI text + vision calls |

## Voice Characters

| Character | Voice | Voice ID | Used For |
|-----------|-------|----------|----------|
| Ship AI | Roger (laid-back, casual) | `CwhRBWXzGAHq8TQ4Fs17` | Greeting, upgrade reactions, upgrade reviews |
| Shop Merchant | Toby - Little Mythical Monster (raspy goblin) | `Z7RrOqZFTyLpIlzCgfsp` | Shop greeting |

## Voice Triggers

### 1. Launch Greeting

**When:** Player clicks "Launch Mission"

`VoiceService.greet()` is called with a `GreetingContext` built from already-loaded data:

- **playerName** — display name
- **playerRank** — position on leaderboard (1-indexed)
- **totalPlayers** — how many players total
- **leaderName / pointsGap** — who's #1 and how far ahead (if not current player)
- **onlinePlayers** — other players currently in-game

This gets turned into a plain text user message like:
```
Quentin, rank #2 of 5. Armel leads, 250 pts ahead. Online: Alex, Milya.
```

**Edge function behavior:**
1. Picks a random title from a list (Captain, Pilot, Star Lord, Space Cowboy, etc.)
2. Prepends `Use title "X" for this player.` to the user message
3. Sends system prompt + user message to GPT-4o-mini (`temperature: 1.1`, `max_tokens: 60`)

**System prompt rules:**
- Always include the player's name
- Use the randomly provided title (not always "Commander")
- Don't start with "Welcome back" — vary openings
- No credits/money references — focus on leaderboard and vibe
- Competitive nudges based on leaderboard position
- Max 15 words

### 2. Shop Merchant Greeting

**When:** Player lands on the shop station

**Pre-generation:** Starts when entering docking range (before landing). Uses `onShopApproach` callback from SpaceGame.

`VoiceService.prepareShopGreeting()` builds a `ShopContext`:

- **playerName** — display name
- **credits** — current spendable credits
- **unownedItems** — all items the player hasn't bought yet (shuffled randomly)

Items include: weapons (Space Rifle, Space TNT, Plasma Canon, Rocket Launcher), utilities (Warp Drive, Mission Control Portal), stats (Size, Speed, Landing Speed), cosmetics (Orange/Blue/Purple/Green Glow, Fire/Ice/Rainbow Trail), and Visual upgrade.

**Edge function behavior (`mode: shop`):**
- System prompt: Greedy, smooth-talking space merchant (Watto + goblin shopkeeper)
- Credit-based personality: 1000+ = excited big spender, 500-999 = friendly, 200-499 = disappointed, under 200 = roasts them
- Picks ONE random unowned item to pitch (items are pre-shuffled to ensure variety)
- Varied openings — never starts with "Oh [Name]"
- Max 20 words, `max_tokens: 80`

**Voice:** Toby (raspy goblin) instead of Roger

### 3. Ship & Planet Upgrades (Two-Phase Voice)

**When:** Player submits a ship visual upgrade or planet terraform

#### Phase 1: Prompt Reaction (`upgrade_react`)
- **Triggered:** Immediately when the player submits their customization prompt
- **Mode:** `upgrade_react`
- **Context:** The player's prompt text + upgrade type (ship/planet)
- **Tone:** Sarcastic mechanic/architect reacting to the work order
- Examples: "Donuts on a spaceship? Bold choice." / "Flame decals? What is this, a space minivan?"

#### Phase 2: Vision Review (`upgrade_review`)
- **Triggered:** After the image is generated (pre-generated in parallel with saving)
- **Mode:** `upgrade_review`
- **Context:** The player's original prompt + the generated image URL
- **How it works:** Uses OpenAI Vision (gpt-4o-mini) to look at the actual generated image
- **Tone:** Sarcastic — picks ONE specific element from the image and roasts it. No listing/describing everything visible.
  - Close match: "Okay fine, that actually slaps."
  - Somewhat close: "I see the flames... but that's more of an angry lizard than a dragon."
  - Way off: Compares what it looks like vs what was asked — "That's supposed to be a laser cannon? Looks more like a glowing breadstick."
- Max 15 words

**Flow in App.tsx:**
```
buyVisualUpgrade() / terraformPlanet()
  ├── Submit prompt → voiceService.commentOnUpgrade('ship', 'start', promptText)
  ├── ... FAL.ai generates image, background removal ...
  ├── Background removed → voiceService.prepareUpgradeReview('ship', promptText, imageUrl)
  ├── ... save image, update state (in parallel with voice generation) ...
  └── Image appears → play pre-generated voice blob
```

## Text-to-Speech

Direct browser call to ElevenLabs (CORS supported):
- **Ship AI voice:** Roger (`CwhRBWXzGAHq8TQ4Fs17`)
- **Shop voice:** Toby (`Z7RrOqZFTyLpIlzCgfsp`)
- Model: `eleven_flash_v2_5`
- Format: `mp3_22050_32`
- Plays via `new Audio(blobUrl)`
- TTS method accepts optional voice parameter: `tts(text, voice?)`

## Timing

Typical end-to-end per voice line: ~800-1200ms
- Edge function + OpenAI: ~400-600ms (vision calls ~600-900ms)
- ElevenLabs TTS: ~300-500ms
- First call after idle adds ~150ms cold start
- **Pre-generated lines:** Near-instant playback (0ms perceived delay when pre-gen finishes before image appears)

## API Keys

| Service | Key Location |
|---------|-------------|
| OpenAI | Supabase secret `OPENAI_API_KEY` (never in frontend) |
| ElevenLabs | `VoiceService.ts` constant (CORS-safe, browser-callable) |

## Edge Function Modes

| Mode | Trigger | Uses Vision | Voice | Description |
|------|---------|-------------|-------|-------------|
| *(default)* | Launch greeting | No | Roger | Random title + leaderboard context |
| `shop` | Shop landing | No | Toby (goblin) | Greedy merchant, credit-aware, pitches random item |
| `upgrade_react` | Upgrade submitted | No | Roger | Sarcastic reaction to player's prompt |
| `upgrade_review` | Upgrade complete | Yes | Roger | Picks one element from image, sarcastic remark |

## Ideas Explored / Shelved

- **Task landing comments** — witty reaction when opening a notion planet. Removed because it felt overwhelming with voice on every planet click.
- **Robot voices** — tested ElevenLabs robot/mechanical voices (Herbert, Retro Robot, etc.). All sounded gimmicky. Roger's natural delivery works better for witty/sarcastic lines.
- **Custom generated voices** — tested ElevenLabs Voice Design with Marvin-like robot prompts. The generated voices sounded different in-game vs the ElevenLabs preview, especially on the flash model. Reverted to pre-made voices.
- **Multilingual v2 model** — higher quality but 2x cost and ~200-300ms more latency. Didn't noticeably improve generated voices. Stayed with flash.
- **Credits in greeting** — removed because it was redundant with the shop merchant who already handles credit-based banter.

## Potential Future Triggers

- Completing a task (celebration line)
- Another player overtaking on leaderboard
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
- `[Voice] Upgrade comment:` — upgrade type, phase, prompt
- `[Voice] Shop greeting:` / `[Voice] Shop context:` — shop data
- `[Voice] Pre-generating...` — pre-gen started (shop or upgrade review)
- `[Voice] Pre-gen OpenAI: Xms → "text"` — pre-gen text ready
- `[Voice] Pre-gen total: Xms` — pre-gen audio ready
- `[Voice] OpenAI: Xms → "text"` — generated line + timing
- `[Voice] ElevenLabs: Xms` — TTS timing
- `[Voice] Total: Xms` — end-to-end
