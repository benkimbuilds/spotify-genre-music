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
