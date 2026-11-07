# Aztec — Lightroom presets for Mecca, Madinah & Jeddah

A React + Vite app that stores your Lightroom presets and recommends the best one for where, when and what you are shooting.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (works from any folder or host)
npm test         # logic checks, no browser needed
```

## What it does

- **Recommend**: pick a city, a subject (Haram courtyards, Tawaf, Mount Uhud, Al-Balad, night skyline…), the sky (clear, hazy, overcast) and an optional look (punchy, soft, film, B&W). The app works out where the sun is for that city (Saudi time, offline) and ranks every preset, with the reasons and what to watch for. A day plan shows the best presets for each light of the day.
- **Cheat sheet**: the top preset for every subject × light slot in a city.
- **Library**: search, filter, add, edit, duplicate, delete. Import `.json` presets (single, array, or `{ "presets": [...] }`, also by drag and drop), export a backup, and export any preset as a Lightroom `.xmp`, plain-text recipe, or JSON.

Presets are saved in the browser (`localStorage`). Export a backup now and then.

## How recommendations work

Scoring (0–100) uses only each preset's own data: `timeOfDay` tags (38%), `locations` tags and notes vs the subject (34%), look/contrast (14%, 26% when you choose a look), sky conditions from its highlights, dehaze and contrast (10%), and a city match (4%). Edit a preset's tags and places in the editor to change where it ranks. Add `Jeddah` to a preset's places to prefer it there.

## Notes

- `src/data/presets/*.json` are the bundled presets. `uhud-volcanic-earth.json` was rebuilt from your guide, because the file you attached under that name contained a copy of Velvet Medina.
- The `.xmp` export is best-effort and uses relative white balance. Test it in Lightroom before relying on it.
