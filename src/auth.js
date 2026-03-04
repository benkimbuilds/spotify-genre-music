// src/auth.js
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID';
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;
const SCOPES = 'user-library-read user-read-private';
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
