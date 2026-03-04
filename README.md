# Genrexplore

3D music library visualizer that connects to your Spotify account and displays your saved tracks as an interactive sphere clustered by genre.

## Local Development

```bash
cp .env.example .env
# Fill in VITE_SPOTIFY_CLIENT_ID and VITE_LASTFM_API_KEY

npm install
npm run start:dev
```

This runs the Vite dev server on `http://127.0.0.1:3000` and the cache server on port 3001.

### Getting API Keys

- **Spotify**: Create an app at https://developer.spotify.com/dashboard. Add `http://127.0.0.1:3000` as a redirect URI.
- **Last.fm**: Create an API account at https://www.last.fm/api/account/create

## Deploy to Railway

1. Push your repo to GitHub
2. Create a new project on [Railway](https://railway.app) from the repo
3. Set environment variables:
   - `VITE_SPOTIFY_CLIENT_ID` — your Spotify app client ID
   - `VITE_LASTFM_API_KEY` — your Last.fm API key
   - `VITE_SPOTIFY_REDIRECT_URI` — your Railway app URL (e.g. `https://genrexplore-production.up.railway.app`)
4. Set build command: `npm run build`
5. Set start command: `npm start`
6. Add a **volume** mounted at `/data` and set `DB_PATH=/data/genre-cache.db` so the cache persists across deploys
7. Add your Railway app URL as a redirect URI in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## Tech Stack

- Three.js (InstancedMesh, CSS2DRenderer, OrbitControls)
- Spotify Web API (OAuth 2.0 PKCE)
- Last.fm API (genre tagging)
- Express + better-sqlite3 (cache server)
- Vite
