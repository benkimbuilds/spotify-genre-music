// src/api.js
const BASE = 'https://api.spotify.com/v1';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY;

async function fetchWithAuth(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  return res.json();
}

async function getSpotifyUserId(token) {
  const data = await fetchWithAuth(`${BASE}/me`, token);
  return data.id;
}

async function getCachedTracks(userId) {
  try {
    const res = await fetch(`${CACHE_SERVER}/tracks?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.cached || data.pages.length === 0) return null;
    return data.pages.flatMap(p => p.tracks);
  } catch {
    return null;
  }
}

async function storeCachedTracks(userId, pages) {
  try {
    await fetch(`${CACHE_SERVER}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, pages }),
    });
  } catch { /* best-effort */ }
}

export async function fetchSavedTracks(token, onProgress) {
  // Get user ID for cache key
  let userId;
  try {
    userId = await getSpotifyUserId(token);
  } catch {
    userId = null;
  }

  // Check cache
  if (userId) {
    onProgress?.('Checking track cache...');
    const cached = await getCachedTracks(userId);
    if (cached) {
      onProgress?.(`Loaded ${cached.length} tracks from cache`);
      return cached;
    }
  }

  // Fetch from Spotify, storing each page for cache
  const tracks = [];
  const pages = [];
  let url = `${BASE}/me/tracks?limit=50`;
  let page = 0;

  while (url && tracks.length < 500) {
    const data = await fetchWithAuth(url, token);
    const pageTracks = data.items.map(item => item.track);
    tracks.push(...pageTracks);
    pages.push({ page, tracks: pageTracks });
    url = data.next;
    page++;
    onProgress?.(`Loaded ${tracks.length} tracks...`);
  }

  // Store in cache
  if (userId && pages.length > 0) {
    await storeCachedTracks(userId, pages);
  }

  return tracks;
}

export async function fetchAudioFeatures(token, trackIds) {
  const features = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100);
    try {
      const data = await fetchWithAuth(
        `${BASE}/audio-features?ids=${batch.join(',')}`,
        token
      );
      features.push(...data.audio_features);
    } catch (e) {
      console.warn('Audio features unavailable (Spotify restricted this endpoint for newer apps):', e.message);
      return [];
    }
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

const CACHE_SERVER = import.meta.env.VITE_CACHE_SERVER || 'http://127.0.0.1:3001';

async function getCachedGenresBatch(artistNames) {
  try {
    const res = await fetch(`${CACHE_SERVER}/genres/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artists: artistNames }),
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function storeCachedGenres(entries) {
  try {
    await fetch(`${CACHE_SERVER}/genres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
  } catch { /* best-effort */ }
}

async function fetchLastFmTags(artistName) {
  if (!LASTFM_KEY) return [];
  try {
    const params = new URLSearchParams({
      method: 'artist.getTopTags',
      artist: artistName,
      api_key: LASTFM_KEY,
      format: 'json',
    });
    const res = await fetch(`${LASTFM_BASE}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.toptags?.tag) return [];
    return data.toptags.tag
      .filter(t => t.count > 0)
      .slice(0, 5)
      .map(t => t.name.toLowerCase());
  } catch {
    return [];
  }
}

async function fetchGenresFromLastFm(artistNames, onProgress) {
  const unique = [...new Set(artistNames)];

  // Batch lookup from cache server
  onProgress?.('Checking genre cache...');
  const cached = await getCachedGenresBatch(unique);
  const cachedCount = Object.keys(cached).length;

  const genreMap = new Map();
  const uncached = [];

  for (const name of unique) {
    // Cache lookup is case-insensitive on the server; check lowercased keys
    const match = Object.entries(cached).find(
      ([k]) => k.toLowerCase() === name.toLowerCase()
    );
    if (match) {
      genreMap.set(name, match[1]);
    } else {
      uncached.push(name);
    }
  }

  if (cachedCount > 0) {
    onProgress?.(`${cachedCount}/${unique.length} artists cached, fetching ${uncached.length} from Last.fm...`);
  }

  // Fetch uncached from Last.fm and batch-store results
  const toStore = [];
  for (let i = 0; i < uncached.length; i++) {
    const tags = await fetchLastFmTags(uncached[i]);
    genreMap.set(uncached[i], tags);
    toStore.push({ artist: uncached[i], tags });
    if (i % 10 === 0 && uncached.length > 10) {
      onProgress?.(`Fetching genres... ${i}/${uncached.length} artists`);
    }
  }

  // Store new results in cache server
  if (toStore.length > 0) {
    await storeCachedGenres(toStore);
  }

  return genreMap;
}

// Simple hash to generate deterministic values from a string
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function pseudoFeature(id, salt) {
  return (((hashCode(id + salt) & 0x7fffffff) % 1000) / 1000);
}

export async function loadLibrary(token, onProgress) {
  onProgress?.('Fetching saved tracks...');
  const tracks = await fetchSavedTracks(token, onProgress);

  onProgress?.('Fetching audio features...');
  const trackIds = tracks.map(t => t.id).filter(Boolean);
  const features = await fetchAudioFeatures(token, trackIds);

  const hasFeatures = features.length > 0;
  if (!hasFeatures) {
    onProgress?.('Audio features unavailable - using track metadata for positioning...');
  }

  // Try Spotify artist genres first
  onProgress?.('Fetching artist data...');
  const artistIds = tracks.flatMap(t => t.artists.map(a => a.id)).filter(Boolean);
  let artists = [];
  try {
    artists = await fetchArtists(token, artistIds);
  } catch (e) {
    console.warn('Spotify artist data unavailable:', e.message);
  }

  const artistGenreMap = new Map(); // artistId -> genres
  let hasSpotifyGenres = false;
  for (const artist of artists) {
    if (artist && artist.genres?.length > 0) {
      artistGenreMap.set(artist.id, artist.genres);
      hasSpotifyGenres = true;
    }
  }

  // Fall back to Last.fm if Spotify genres are empty
  const artistNameGenreMap = new Map(); // artistName -> genres
  if (!hasSpotifyGenres && LASTFM_KEY) {
    onProgress?.('Spotify genres unavailable - fetching from Last.fm...');
    const artistNames = [...new Set(tracks.flatMap(t => t.artists.map(a => a.name)))];
    const lastfmGenres = await fetchGenresFromLastFm(artistNames, onProgress);
    for (const [name, tags] of lastfmGenres) {
      artistNameGenreMap.set(name, tags);
    }
  }

  const featureMap = new Map();
  for (const f of features) {
    if (f) featureMap.set(f.id, f);
  }

  const library = tracks.map(track => {
    const feat = featureMap.get(track.id);

    // Try Spotify genres (by artist ID), then Last.fm genres (by artist name)
    let genres = track.artists.flatMap(a => artistGenreMap.get(a.id) || []);
    if (genres.length === 0) {
      genres = track.artists.flatMap(a => artistNameGenreMap.get(a.name) || []);
    }
    const primaryGenre = genres[0] || 'unknown';

    return {
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artistIds: track.artists.map(a => a.id),
      album: track.album?.name,
      albumArt: track.album?.images?.[0]?.url,
      previewUrl: track.preview_url,
      energy: feat?.energy ?? pseudoFeature(track.id, 'energy'),
      valence: feat?.valence ?? pseudoFeature(track.id, 'valence'),
      danceability: feat?.danceability ?? pseudoFeature(track.id, 'dance'),
      tempo: feat?.tempo ?? 80 + pseudoFeature(track.id, 'tempo') * 100,
      acousticness: feat?.acousticness ?? pseudoFeature(track.id, 'acoustic'),
      genres,
      primaryGenre,
    };
  });

  onProgress?.(`Loaded ${library.length} tracks`);
  return library;
}
