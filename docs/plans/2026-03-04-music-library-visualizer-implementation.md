# Music Library 3D Visualizer - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-side web app that connects to Spotify, fetches the user's saved tracks, and renders them as an interactive 3D spherical graph clustered by genre.

**Architecture:** Vite + vanilla JS + Three.js. Spotify OAuth PKCE for auth (no backend). Audio features mapped to spherical coordinates, genre clustering applied, rendered as InstancedMesh with OrbitControls.

**Tech Stack:** Vite, Three.js, Spotify Web API (OAuth PKCE)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/main.js`

**Step 1: Initialize project and install dependencies**

Run:
```bash
cd /Users/locke/code/play/music
npm init -y
npm install three
npm install -D vite
```

**Step 2: Create vite.config.js**

```js
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { port: 3000 },
});
```

**Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Music Library Visualizer</title>
  <link rel="stylesheet" href="/src/styles.css" />
</head>
<body>
  <div id="app">
    <div id="login-screen">
      <h1>Music Library Visualizer</h1>
      <p>Connect your Spotify account to explore your library in 3D</p>
      <button id="login-btn">Connect Spotify</button>
    </div>
    <div id="loading-screen" class="hidden">
      <div class="spinner"></div>
      <p id="loading-status">Loading your library...</p>
    </div>
    <canvas id="canvas" class="hidden"></canvas>
    <div id="tooltip" class="hidden"></div>
    <div id="genre-panel" class="hidden">
      <h3>Genres</h3>
      <div id="genre-list"></div>
    </div>
    <div id="track-detail" class="hidden">
      <img id="detail-art" />
      <div id="detail-info">
        <p id="detail-name"></p>
        <p id="detail-artist"></p>
        <p id="detail-album"></p>
      </div>
      <button id="detail-close">×</button>
    </div>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Step 4: Create src/styles.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0a0a0a;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
}

.hidden { display: none !important; }

#login-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
}

#login-screen h1 { font-size: 2.5rem; font-weight: 300; }
#login-screen p { color: #888; font-size: 1.1rem; }

#login-btn {
  margin-top: 24px;
  padding: 14px 40px;
  background: #1db954;
  color: white;
  border: none;
  border-radius: 32px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s;
}
#login-btn:hover { background: #1ed760; }

#loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #333;
  border-top-color: #1db954;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

#canvas {
  display: block;
  width: 100vw;
  height: 100vh;
}

#tooltip {
  position: fixed;
  padding: 8px 14px;
  background: rgba(20, 20, 20, 0.95);
  border: 1px solid #333;
  border-radius: 8px;
  font-size: 0.85rem;
  pointer-events: none;
  z-index: 100;
  max-width: 250px;
}
#tooltip .track-name { font-weight: 600; margin-bottom: 2px; }
#tooltip .track-artist { color: #999; }

#genre-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 200px;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(15, 15, 15, 0.9);
  border: 1px solid #222;
  border-radius: 12px;
  padding: 16px;
  z-index: 50;
}
#genre-panel h3 { margin-bottom: 12px; font-size: 0.9rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }

.genre-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 0.85rem;
}
.genre-item input { accent-color: #1db954; }
.genre-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

#track-detail {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(15, 15, 15, 0.95);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 12px 20px;
  z-index: 50;
}
#detail-art { width: 56px; height: 56px; border-radius: 6px; }
#detail-name { font-weight: 600; }
#detail-artist { color: #999; font-size: 0.85rem; }
#detail-album { color: #666; font-size: 0.8rem; }
#detail-close {
  background: none;
  border: none;
  color: #666;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 4px;
}
#detail-close:hover { color: #fff; }
```

**Step 5: Create src/main.js (stub)**

```js
// src/main.js
console.log('Music Library Visualizer loaded');
```

**Step 6: Add dev script to package.json and verify**

Add `"dev": "vite"` to scripts. Run: `npx vite --open` to verify the login screen renders.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Vite, Three.js, HTML, and CSS"
```

---

### Task 2: Spotify OAuth PKCE Auth

**Files:**
- Create: `src/auth.js`
- Modify: `src/main.js`

**Step 1: Create src/auth.js**

Implement the full PKCE flow. The Spotify client ID should be configurable (we'll use a placeholder that the user replaces).

```js
// src/auth.js
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-library-read';
const TOKEN_KEY = 'spotify_access_token';
const VERIFIER_KEY = 'spotify_code_verifier';

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, v => chars[v % chars.length]).join('');
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function redirectToSpotifyAuth() {
  const verifier = generateRandomString(64);
  const challenge = base64urlEncode(await sha256(verifier));
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return null;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    console.error('Token exchange failed:', await res.text());
    return null;
  }

  const data = await res.json();
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.setItem(TOKEN_KEY, data.access_token);

  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);

  return data.access_token;
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
```

**Step 2: Wire up main.js with auth**

```js
// src/main.js
import { redirectToSpotifyAuth, handleCallback, getToken } from './auth.js';

const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', redirectToSpotifyAuth);

async function init() {
  // Check for OAuth callback
  let token = await handleCallback();
  if (!token) token = getToken();

  if (token) {
    loginScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    // Next task: fetch library and render
    console.log('Authenticated! Token ready.');
  }
}

init();
```

**Step 3: Create .env.example**

```
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

**Step 4: Verify manually**

Run `npx vite`, click "Connect Spotify", verify redirect works (will fail token exchange without a real client ID, but the flow should be correct).

**Step 5: Commit**

```bash
git add src/auth.js src/main.js .env.example
git commit -m "feat: add Spotify OAuth PKCE authentication flow"
```

---

### Task 3: Spotify API - Fetch Library Data

**Files:**
- Create: `src/api.js`
- Modify: `src/main.js`

**Step 1: Create src/api.js**

```js
// src/api.js
const BASE = 'https://api.spotify.com/v1';

async function fetchWithAuth(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  return res.json();
}

export async function fetchSavedTracks(token, onProgress) {
  const tracks = [];
  let url = `${BASE}/me/tracks?limit=50`;
  let page = 0;

  while (url && tracks.length < 500) {
    const data = await fetchWithAuth(url, token);
    tracks.push(...data.items.map(item => item.track));
    url = data.next;
    page++;
    onProgress?.(`Loaded ${tracks.length} tracks...`);
  }

  return tracks;
}

export async function fetchAudioFeatures(token, trackIds) {
  const features = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100);
    const data = await fetchWithAuth(
      `${BASE}/audio-features?ids=${batch.join(',')}`,
      token
    );
    features.push(...data.audio_features);
  }
  return features;
}

export async function fetchArtists(token, artistIds) {
  const artists = [];
  const unique = [...new Set(artistIds)];
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const data = await fetchWithAuth(
      `${BASE}/artists?ids=${batch.join(',')}`,
      token
    );
    artists.push(...data.artists);
  }
  return artists;
}

export async function loadLibrary(token, onProgress) {
  onProgress?.('Fetching saved tracks...');
  const tracks = await fetchSavedTracks(token, onProgress);

  onProgress?.('Fetching audio features...');
  const trackIds = tracks.map(t => t.id).filter(Boolean);
  const features = await fetchAudioFeatures(token, trackIds);

  onProgress?.('Fetching artist data...');
  const artistIds = tracks.flatMap(t => t.artists.map(a => a.id)).filter(Boolean);
  const artists = await fetchArtists(token, artistIds);

  // Build artist genre map
  const artistGenreMap = new Map();
  for (const artist of artists) {
    if (artist) artistGenreMap.set(artist.id, artist.genres || []);
  }

  // Merge into unified track objects
  const featureMap = new Map();
  for (const f of features) {
    if (f) featureMap.set(f.id, f);
  }

  const library = tracks.map(track => {
    const feat = featureMap.get(track.id);
    const genres = track.artists
      .flatMap(a => artistGenreMap.get(a.id) || []);
    const primaryGenre = genres[0] || 'unknown';

    return {
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artistIds: track.artists.map(a => a.id),
      album: track.album?.name,
      albumArt: track.album?.images?.[0]?.url,
      previewUrl: track.preview_url,
      energy: feat?.energy ?? 0.5,
      valence: feat?.valence ?? 0.5,
      danceability: feat?.danceability ?? 0.5,
      tempo: feat?.tempo ?? 120,
      acousticness: feat?.acousticness ?? 0.5,
      genres,
      primaryGenre,
    };
  });

  onProgress?.(`Loaded ${library.length} tracks with features`);
  return library;
}
```

**Step 2: Wire into main.js**

Add the `loadLibrary` call after authentication:

```js
// In main.js - add import and call
import { loadLibrary } from './api.js';

// Inside init(), after token is confirmed:
const loadingStatus = document.getElementById('loading-status');
const library = await loadLibrary(token, (msg) => {
  loadingStatus.textContent = msg;
});
console.log('Library loaded:', library.length, 'tracks');
```

**Step 3: Commit**

```bash
git add src/api.js src/main.js
git commit -m "feat: add Spotify API integration for library, audio features, and artists"
```

---

### Task 4: 3D Sphere Layout & Clustering

**Files:**
- Create: `src/clustering.js`

**Step 1: Create src/clustering.js**

```js
// src/clustering.js

// 20-color palette for genres
const GENRE_COLORS = [
  0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0x6c5ce7,
  0xa29bfe, 0xfd79a8, 0x00b894, 0xe17055, 0x0984e3,
  0xfdcb6e, 0xe84393, 0x00cec9, 0xd63031, 0x74b9ff,
  0x55efc4, 0xffeaa7, 0xdfe6e9, 0xb2bec3, 0x636e72,
];

export function computeLayout(library) {
  // Assign genre colors
  const genreSet = [...new Set(library.map(t => t.primaryGenre))];
  const genreColorMap = new Map();
  genreSet.forEach((genre, i) => {
    genreColorMap.set(genre, GENRE_COLORS[i % GENRE_COLORS.length]);
  });

  const RADIUS = 50;
  const RADIUS_OFFSET = 5;

  // Step 1: Position by audio features on sphere
  const nodes = library.map(track => {
    const theta = track.energy * Math.PI * 2;
    const phi = track.valence * Math.PI;
    const r = RADIUS + (track.danceability - 0.5) * RADIUS_OFFSET * 2;

    return {
      ...track,
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta),
      color: genreColorMap.get(track.primaryGenre) || 0x636e72,
    };
  });

  // Step 2: Genre clustering - nudge toward genre centroids
  const genreGroups = new Map();
  for (const node of nodes) {
    if (!genreGroups.has(node.primaryGenre)) {
      genreGroups.set(node.primaryGenre, []);
    }
    genreGroups.get(node.primaryGenre).push(node);
  }

  for (const [, group] of genreGroups) {
    if (group.length < 2) continue;
    const cx = group.reduce((s, n) => s + n.x, 0) / group.length;
    const cy = group.reduce((s, n) => s + n.y, 0) / group.length;
    const cz = group.reduce((s, n) => s + n.z, 0) / group.length;

    const PULL = 0.25; // 25% toward centroid
    for (const node of group) {
      node.x += (cx - node.x) * PULL;
      node.y += (cy - node.y) * PULL;
      node.z += (cz - node.z) * PULL;
    }
  }

  // Step 3: Build edges (same artist connections)
  const edges = [];
  const artistTrackMap = new Map();
  for (let i = 0; i < nodes.length; i++) {
    for (const aid of nodes[i].artistIds) {
      if (!artistTrackMap.has(aid)) artistTrackMap.set(aid, []);
      artistTrackMap.get(aid).push(i);
    }
  }
  for (const [, indices] of artistTrackMap) {
    if (indices.length < 2) continue;
    // Connect sequential pairs to avoid O(n^2)
    for (let i = 0; i < indices.length - 1; i++) {
      edges.push([indices[i], indices[i + 1]]);
    }
  }

  return { nodes, edges, genreColorMap };
}
```

**Step 2: Commit**

```bash
git add src/clustering.js
git commit -m "feat: add sphere layout computation with genre clustering and artist edges"
```

---

### Task 5: Three.js 3D Scene & Rendering

**Files:**
- Create: `src/graph.js`

**Step 1: Create src/graph.js**

```js
// src/graph.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let instancedMesh, edgeLines;
let nodesData = [];
let raycaster, mouse;
let hoveredIndex = -1;
let audioEl = null;

const tooltip = document.getElementById('tooltip');
const trackDetail = document.getElementById('track-detail');
const detailArt = document.getElementById('detail-art');
const detailName = document.getElementById('detail-name');
const detailArtist = document.getElementById('detail-artist');
const detailAlbum = document.getElementById('detail-album');
const detailClose = document.getElementById('detail-close');

const NODE_RADIUS = 0.6;
const HOVER_SCALE = 2.0;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

export function initScene(canvas) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 0, 120);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 20;
  controls.maxDistance = 250;

  // Ambient light
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 50, 50);
  scene.add(dirLight);

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 1 };
  mouse = new THREE.Vector2();

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);
  detailClose.addEventListener('click', () => {
    trackDetail.classList.add('hidden');
    if (audioEl) { audioEl.pause(); audioEl = null; }
  });

  animate();
}

export function renderGraph({ nodes, edges }) {
  nodesData = nodes;

  // Remove old meshes
  if (instancedMesh) scene.remove(instancedMesh);
  if (edgeLines) scene.remove(edgeLines);

  // Instanced spheres
  const geo = new THREE.SphereGeometry(NODE_RADIUS, 12, 8);
  const mat = new THREE.MeshLambertMaterial();
  instancedMesh = new THREE.InstancedMesh(geo, mat, nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    dummy.position.set(n.x, n.y, n.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
    color.setHex(n.color);
    instancedMesh.setColorAt(i, color);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.instanceColor.needsUpdate = true;
  scene.add(instancedMesh);

  // Edge lines
  if (edges.length > 0) {
    const positions = [];
    for (const [a, b] of edges) {
      positions.push(nodes[a].x, nodes[a].y, nodes[a].z);
      positions.push(nodes[b].x, nodes[b].y, nodes[b].z);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.12, transparent: true });
    edgeLines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(edgeLines);
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(instancedMesh);

  // Reset previous hover
  if (hoveredIndex >= 0) {
    setInstanceScale(hoveredIndex, 1);
    hoveredIndex = -1;
  }

  if (intersects.length > 0) {
    const idx = intersects[0].instanceId;
    hoveredIndex = idx;
    setInstanceScale(idx, HOVER_SCALE);

    const track = nodesData[idx];
    tooltip.innerHTML = `<div class="track-name">${track.name}</div><div class="track-artist">${track.artist}</div>`;
    tooltip.style.left = e.clientX + 12 + 'px';
    tooltip.style.top = e.clientY + 12 + 'px';
    tooltip.classList.remove('hidden');
    document.body.style.cursor = 'pointer';
  } else {
    tooltip.classList.add('hidden');
    document.body.style.cursor = 'default';
  }
}

function onClick(e) {
  if (hoveredIndex < 0) return;
  const track = nodesData[hoveredIndex];

  // Show detail panel
  if (track.albumArt) detailArt.src = track.albumArt;
  detailName.textContent = track.name;
  detailArtist.textContent = track.artist;
  detailAlbum.textContent = track.album || '';
  trackDetail.classList.remove('hidden');

  // Play preview
  if (track.previewUrl) {
    if (audioEl) audioEl.pause();
    audioEl = new Audio(track.previewUrl);
    audioEl.volume = 0.5;
    audioEl.play().catch(() => {});
  }
}

function setInstanceScale(index, scale) {
  const matrix = new THREE.Matrix4();
  instancedMesh.getMatrixAt(index, matrix);
  const pos = new THREE.Vector3();
  pos.setFromMatrixPosition(matrix);
  dummy.position.copy(pos);
  dummy.scale.set(scale, scale, scale);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(index, dummy.matrix);
  instancedMesh.instanceMatrix.needsUpdate = true;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Genre filtering
export function setNodeVisibility(visibleIndices) {
  // Rebuild with only visible nodes - simpler approach: move hidden nodes far away
  for (let i = 0; i < nodesData.length; i++) {
    const visible = visibleIndices.has(i);
    const n = nodesData[i];
    dummy.position.set(
      visible ? n.x : 99999,
      visible ? n.y : 99999,
      visible ? n.z : 99999
    );
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}
```

**Step 2: Commit**

```bash
git add src/graph.js
git commit -m "feat: add Three.js 3D scene with instanced mesh, orbit controls, hover, and click interactions"
```

---

### Task 6: UI - Genre Filter Panel

**Files:**
- Create: `src/ui.js`

**Step 1: Create src/ui.js**

```js
// src/ui.js
import { setNodeVisibility } from './graph.js';

const genrePanel = document.getElementById('genre-panel');
const genreList = document.getElementById('genre-list');

let nodesRef = [];
let genreEnabled = new Map();

export function initGenreFilter(nodes, genreColorMap) {
  nodesRef = nodes;
  genrePanel.classList.remove('hidden');
  genreList.innerHTML = '';

  // Sort genres by track count
  const genreCounts = new Map();
  for (const n of nodes) {
    genreCounts.set(n.primaryGenre, (genreCounts.get(n.primaryGenre) || 0) + 1);
  }
  const sorted = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);

  for (const [genre, count] of sorted) {
    genreEnabled.set(genre, true);
    const colorHex = '#' + (genreColorMap.get(genre) || 0x636e72).toString(16).padStart(6, '0');

    const item = document.createElement('label');
    item.className = 'genre-item';
    item.innerHTML = `
      <input type="checkbox" checked data-genre="${genre}" />
      <span class="genre-swatch" style="background:${colorHex}"></span>
      <span>${genre} (${count})</span>
    `;
    item.querySelector('input').addEventListener('change', (e) => {
      genreEnabled.set(genre, e.target.checked);
      updateVisibility();
    });
    genreList.appendChild(item);
  }
}

function updateVisibility() {
  const visible = new Set();
  for (let i = 0; i < nodesRef.length; i++) {
    if (genreEnabled.get(nodesRef[i].primaryGenre)) {
      visible.add(i);
    }
  }
  setNodeVisibility(visible);
}
```

**Step 2: Commit**

```bash
git add src/ui.js
git commit -m "feat: add genre filter panel with toggle visibility"
```

---

### Task 7: Wire Everything Together in main.js

**Files:**
- Modify: `src/main.js`

**Step 1: Update main.js to connect all modules**

```js
// src/main.js
import { redirectToSpotifyAuth, handleCallback, getToken } from './auth.js';
import { loadLibrary } from './api.js';
import { computeLayout } from './clustering.js';
import { initScene, renderGraph } from './graph.js';
import { initGenreFilter } from './ui.js';

const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const canvas = document.getElementById('canvas');
const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', redirectToSpotifyAuth);

async function init() {
  let token = await handleCallback();
  if (!token) token = getToken();

  if (!token) return; // Show login screen

  loginScreen.classList.add('hidden');
  loadingScreen.classList.remove('hidden');

  try {
    const library = await loadLibrary(token, (msg) => {
      loadingStatus.textContent = msg;
    });

    loadingStatus.textContent = 'Computing 3D layout...';
    const { nodes, edges, genreColorMap } = computeLayout(library);

    loadingScreen.classList.add('hidden');
    canvas.classList.remove('hidden');

    initScene(canvas);
    renderGraph({ nodes, edges });
    initGenreFilter(nodes, genreColorMap);
  } catch (err) {
    console.error('Failed to load library:', err);
    loadingStatus.textContent = 'Error loading library. Please refresh and try again.';
  }
}

init();
```

**Step 2: Verify the full app runs**

Run: `npx vite`
- Login screen should show
- After Spotify auth (with real client ID), should load library and render 3D sphere

**Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire all modules together - complete app flow from auth to 3D rendering"
```

---

### Task 8: Final Polish & README

**Files:**
- Modify: `index.html` (if needed)
- Create: `.gitignore`

**Step 1: Create .gitignore**

```
node_modules
dist
.env
.env.local
```

**Step 2: Verify full flow end-to-end**

Run: `npx vite`
1. Login screen renders
2. Click "Connect Spotify" → redirect works
3. After auth → library loads with progress
4. 3D sphere renders with colored nodes
5. Hover shows tooltip
6. Click plays preview
7. Genre panel filters nodes

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete v1 of music library 3D visualizer"
```
