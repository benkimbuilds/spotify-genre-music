// src/main.js
import { redirectToSpotifyAuth, handleCallback, getToken } from './auth.js';

const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', redirectToSpotifyAuth);

async function init() {
  let token = await handleCallback();
  if (!token) token = getToken();

  if (token) {
    loginScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    console.log('Authenticated! Token ready.');
  }
}

init();
