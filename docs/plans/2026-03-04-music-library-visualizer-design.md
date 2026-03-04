# Music Library 3D Visualizer - Design

## Overview

A client-side web app that connects to Spotify, fetches the user's saved tracks with audio features, and renders them as an interactive 3D spherical graph. Tracks are positioned by audio characteristics and clustered by genre.

## Tech Stack

- **Vite** - dev server and build tool
- **Vanilla JS** - no framework
- **Three.js** - 3D rendering
- **Spotify Web API** - OAuth PKCE (no backend)

## Architecture

Single-page app. No backend required.

```
music/
  index.html
  src/
    main.js           — app bootstrap
    auth.js           — Spotify OAuth PKCE flow
    api.js            — Spotify API (saved tracks, audio features)
    graph.js          — Three.js scene, sphere layout, interactions
    clustering.js     — genre clustering + edge creation
    ui.js             — overlay UI (tooltips, genre filter, loading)
    styles.css        — dark theme
  vite.config.js
  package.json
```

## Auth Flow

Spotify OAuth 2.0 with PKCE (client-side only):
1. User clicks "Connect Spotify"
2. Redirect to Spotify authorization
3. Redirect back with auth code
4. Exchange code for access token (PKCE, no client secret)
5. Store token in memory (session-only)

Scopes needed: `user-library-read`

## Data Pipeline

1. Fetch saved tracks paginated (GET /me/tracks, 50 per page, up to ~500)
2. Batch fetch audio features (GET /audio-features, 100 per batch)
3. Extract genre from artist data (GET /artists, 50 per batch)
4. Compute 3D positions
5. Build connection edges
6. Render

## 3D Layout

### Positioning (Audio Feature Mapping)

Map audio features to spherical coordinates on a sphere (radius ~50):
- **Longitude (theta):** energy (0-1) mapped to 0-2pi
- **Latitude (phi):** valence (0-1) mapped to 0-pi
- **Radius offset:** danceability (0-1) adds -5 to +5 offset from base radius

Convert to cartesian: x = r*sin(phi)*cos(theta), y = r*cos(phi), z = r*sin(phi)*sin(theta)

### Genre Clustering

After initial positioning, apply gentle force that pulls same-genre tracks closer:
- Group tracks by primary genre
- For each genre group, compute centroid
- Nudge each track 20-30% toward its genre centroid
- This creates visible neighborhoods without losing audio-feature structure

### Connections

- Thin lines between tracks sharing the same artist
- Low opacity (0.15) to avoid clutter

## Visual Design (Simple First)

- **Nodes:** InstancedMesh colored spheres, small radius (~0.5)
- **Colors:** Solid colors from a 20-color genre palette
- **Background:** Dark (#0a0a0a)
- **No post-processing** - raw Three.js rendering

## Interactions

- **Orbit:** OrbitControls - drag to rotate, scroll to zoom
- **Hover:** Raycaster detection, tooltip with track name + artist
- **Click:** Play 30s Spotify preview via Audio API
- **Genre filter:** Sidebar with genre toggles to show/hide clusters

## Future Enhancements (Not in v1)

- Bloom/glow effects
- Star field background
- Genre convex hull shells
- Search highlighting
- Audio feature filter sliders
- SoundCloud integration
- Playlist creation from selections
