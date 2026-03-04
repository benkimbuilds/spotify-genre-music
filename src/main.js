// src/main.js
import { redirectToSpotifyAuth, handleCallback, getToken } from './auth.js';
import { loadLibrary } from './api.js';
import { computeLayout } from './clustering.js';
import { initScene, renderGraph, renderGenreLabels } from './graph.js';
import { initGenreFilter } from './ui.js';

const CACHE_SERVER = import.meta.env.VITE_CACHE_SERVER || (import.meta.env.PROD ? '' : 'http://127.0.0.1:3001');

const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const canvas = document.getElementById('canvas');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const visitCount = document.getElementById('visit-count');

loginBtn.addEventListener('click', redirectToSpotifyAuth);
logoutBtn.addEventListener('click', () => {
  sessionStorage.clear();
  window.location.reload();
});

async function init() {
  let token = await handleCallback();
  if (!token) token = getToken();

  if (!token) return; // Show login screen

  loginScreen.classList.add('hidden');
  loadingScreen.classList.remove('hidden');

  // Record visit and show count
  try {
    const me = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    const res = await fetch(`${CACHE_SERVER}/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: me.id }),
    }).then(r => r.json());
    if (res.count) {
      visitCount.textContent = `${res.count} explorers`;
      visitCount.classList.remove('hidden');
    }
  } catch {}

  try {
    const library = await loadLibrary(token, (msg) => {
      loadingStatus.textContent = msg;
    });

    loadingStatus.textContent = 'Computing 3D layout...';
    const { nodes, edges, genreColorMap, genreAnchors } = computeLayout(library);

    loadingScreen.classList.add('hidden');
    canvas.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');

    initScene(canvas);
    renderGraph({ nodes, edges });
    renderGenreLabels(genreAnchors, genreColorMap);
    initGenreFilter(nodes, genreColorMap, genreAnchors);
  } catch (err) {
    console.error('Failed to load library:', err);
    loadingStatus.textContent = 'Error loading library. Please refresh and try again.';
  }
}

init();
