# hikari.garden

*soft things, kept carefully*

write something. anything. a flower grows.

its shape comes from how you felt, the joy or the fog, the restlessness, the quiet ache of a tuesday. your mood bends its petals, tints its colors, decides how tall it stands. no two are the same. you won't remember making most of them, which is kind of the point.

the garden changes with the hours. morning light gives way to afternoon, bleeds into dusk, settles into night. if it's raining where you are, it rains here too. snow, if it's snowing. after dark the stars come out, and at midnight — well. come see for yourself.

click a flower to remember the day it was planted.

[https://github.com/user-attachments/assets/3e59cb7b-daaa-4087-8668-11f8a05cf684](https://github.com/user-attachments/assets/3e59cb7b-daaa-4087-8668-11f8a05cf684)

## hidden things

- type the konami code and petals will rain from the sky
- click the title five times quickly
- leave the garden idle and watch who visits
- come back at midnight


## growing your own

```bash
git clone https://github.com/Expl0dingCat/hikari.garden.git
cd hikari.garden
make setup
```

the setup wizard asks for a password, your name, timezone, and optional Spotify credentials — then writes `.env` for you.

or do it by hand: `cp .env.example .env` and fill in the values yourself.

```bash
npm run dev
```

### with docker

```bash
make setup     # create .env first
make docker    # builds and starts on port 3000
```

## built with

[SvelteKit](https://svelte.dev) and [PixiJS](https://pixijs.com) for the living canvas. [SQLite](https://github.com/WiseLibs/better-sqlite3) for memory. [Open-Meteo](https://open-meteo.com) for weather. [Spotify Web API](https://developer.spotify.com) for music. everything runs on a single Node.js server.

## deploying

```bash
npm run build
node build
```

listens on port 3000. the `data/` directory holds the database and uploaded images — back it up, that's where the flowers live.

## structure

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

## license

MIT
