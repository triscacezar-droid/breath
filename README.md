# Simple Breath

**Live:** [simplebreath.co.uk](https://simplebreath.co.uk) · [breath-jet.vercel.app](https://breath-jet.vercel.app)

This is a minimal breathing exercise app I made over the weekend using Cursor. 

I hope it helps you calm down and enjoy the world around around you. 

**Life gets busy. Take it easy.**

## Features

- **Breathing modes**: Box breathing (4-4-4-4), equal (1:1), kumbhaka (1:4:2), long exhale (1:2), or custom durations
- **Alternate nostril** (anulom vilom) support
- **12 languages**: English, German, Romanian, Spanish, French, Portuguese, Italian, Polish, Russian, Japanese, Chinese (Simplified), Hindi
- **Multiple themes**: Dark, light, sepia, and more
- **Visualization options**: Words or icons, dots or squares, circle or ring
- **Pace control**: Shows the expected pace of the breathing times you've picked

## Run locally

**All services (frontend + backend):**

```bash
npm install
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:8000](http://localhost:8000) (Zen Chat API)

**Frontend only:**

```bash
cd breath-web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Zen Chat will not work unless the backend is also running—use `npm run dev` from the project root to start both.

## Build

```bash
cd breath-web
npm run build
```

Output is in `breath-web/dist/`.

## Deploy Zen Chat (production)

To enable the Zen Chat companion on the deployed app:

1. **Deploy the backend** – See [zen-chat-backend/README.md](zen-chat-backend/README.md#deploy) for Railway, Render, or Docker. You need a public URL (e.g. `https://zen-chat-xxx.up.railway.app`).

2. **Configure Vercel** – In your project’s Environment Variables, add:
   - `VITE_ZEN_CHAT_ENABLED` = `true`
   - `VITE_ZEN_CHAT_API_URL` = `https://your-backend-url.com` (no trailing slash)

3. **Redeploy** – Trigger a new deployment so the frontend picks up the env vars.

## Breath Browser E2E Skill

In Cursor, you can run a full end-to-end regression of the Breath app using the `breath-browser-e2e-regression` skill.

- **What it does**: Starts from `http://localhost:5173` and walks through breathing session basics, settings and ratios, visibility/presets, themes/languages, About overlay, and Zen Chat (including error handling).
- **How to use**:
  - From repo root, run:
    - `npm install`
    - `npm run dev`
  - In Cursor, invoke the `breath-browser-e2e-regression` skill and follow the checklist in `.cursor/skills/breath-browser-e2e-regression/SKILL.md`.
- **Notes**: For Zen Chat replies, set `OPENAI_API_KEY` for the backend; without it, the skill still verifies that error states are handled gracefully.

## License

MIT — see [LICENSE](LICENSE).

## Contact

trisca.cezar@gmail.com
