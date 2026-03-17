# hikari.garden

*A garden of feelings, grown one day at a time.*

Every journal entry plants a flower. Your mood — joy, energy, tenderness, clarity, hope — becomes its DNA: the curve of its petals, the warmth of its colors, the height of its stem. No two flowers are alike. Over time, a garden grows.

The garden lives and breathes. It shifts from dawn gold to daylight green to dusky violet to deep night blue as the hours pass. Rain falls when it rains outside. Snow drifts when it snows. Stars streak across the sky after dark, and if you're here at midnight, fireflies come out.

Click a flower to remember the day it was planted.


https://github.com/user-attachments/assets/3e59cb7b-daaa-4087-8668-11f8a05cf684


## Hidden things

- Type the Konami code and petals will rain from the sky
- Click the title five times quickly
- Leave the garden idle and watch who visits
- Come back at midnight

## Growing your own

```bash
git clone https://github.com/Expl0dingCat/hikari.garden.git
cd hikari.garden
npm install
cp .env.example .env
```

Generate a password to protect your garden:

```bash
node -e "import('bcryptjs').then(b => console.log(b.hashSync('your-password', 12)))"
```

Paste the hash into `.env` (escape `$` with `\$`), set your name and timezone, and optionally add Spotify API credentials to attach songs to entries.

```bash
npm run dev
```

## Built with

[SvelteKit](https://svelte.dev) and [PixiJS](https://pixijs.com) for the living canvas. [SQLite](https://github.com/WiseLibs/better-sqlite3) for memory. [Open-Meteo](https://open-meteo.com) for weather. [Spotify Web API](https://developer.spotify.com) for music. Everything runs on a single Node.js server.

## Deploying

```bash
npm run build
node build
```

Listens on port 3000. The `data/` directory holds the database and uploaded images — back it up, that's where the flowers live.

## Structure

```
src/
  lib/
    engine/          the living garden — camera, weather, particles,
                     shooting stars, fireflies, grass, idle visitors
    generation/      mood to flower — DNA, pixel art renderer,
                     color palettes, petal shapes, name generator
    components/      the UI — editor, mood selector, date & song
                     pickers, flower reveal card, stats
    server/          database, auth, entry storage
  routes/            pages and API endpoints
data/                sqlite database and images (gitignored)
```

## License

MIT
