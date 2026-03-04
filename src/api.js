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

  const artistGenreMap = new Map();
  for (const artist of artists) {
    if (artist) artistGenreMap.set(artist.id, artist.genres || []);
  }

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
