import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'genre-cache.db');
const db = new Database(dbPath);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve built frontend in production
app.use(express.static(join(__dirname, 'dist')));

db.exec(`
  CREATE TABLE IF NOT EXISTS genre_cache (
    artist TEXT PRIMARY KEY COLLATE NOCASE,
    tags TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks_cache (
    user_id TEXT NOT NULL,
    page INTEGER NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, page)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    user_id TEXT PRIMARY KEY,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  )
`);

const GENRE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const TRACKS_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

const getStmt = db.prepare('SELECT tags, updated_at FROM genre_cache WHERE artist = ?');
const upsertStmt = db.prepare(`
  INSERT INTO genre_cache (artist, tags, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(artist) DO UPDATE SET tags = excluded.tags, updated_at = excluded.updated_at
`);
const getBatchStmt = (placeholders) =>
  db.prepare(`SELECT artist, tags, updated_at FROM genre_cache WHERE artist IN (${placeholders})`);

// GET /genres?artist=Name
app.get('/genres', (req, res) => {
  const { artist } = req.query;
  if (!artist) return res.status(400).json({ error: 'artist param required' });
  const row = getStmt.get(artist);
  if (row && Date.now() - row.updated_at < GENRE_TTL) {
    return res.json({ artist, tags: JSON.parse(row.tags), cached: true });
  }
  res.json({ artist, tags: null, cached: false });
});

// POST /genres/batch - lookup many artists at once
app.post('/genres/batch', (req, res) => {
  const { artists } = req.body;
  if (!Array.isArray(artists)) return res.status(400).json({ error: 'artists array required' });

  const placeholders = artists.map(() => '?').join(',');
  const rows = getBatchStmt(placeholders).all(...artists);
  const now = Date.now();

  const result = {};
  for (const row of rows) {
    if (now - row.updated_at < GENRE_TTL) {
      result[row.artist] = JSON.parse(row.tags);
    }
  }
  res.json(result);
});

// POST /genres - store one or many
app.post('/genres', (req, res) => {
  const { entries } = req.body; // [{ artist, tags }]
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });

  const now = Date.now();
  const upsertMany = db.transaction((items) => {
    for (const { artist, tags } of items) {
      upsertStmt.run(artist, JSON.stringify(tags), now);
    }
  });
  upsertMany(entries);
  res.json({ stored: entries.length });
});

// --- Tracks cache ---

const getTracksPageStmt = db.prepare(
  'SELECT data, updated_at FROM tracks_cache WHERE user_id = ? AND page = ?'
);
const getAllTracksPagesStmt = db.prepare(
  'SELECT page, data, updated_at FROM tracks_cache WHERE user_id = ? ORDER BY page'
);
const upsertTracksStmt = db.prepare(`
  INSERT INTO tracks_cache (user_id, page, data, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id, page) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
`);
const deleteUserTracksStmt = db.prepare('DELETE FROM tracks_cache WHERE user_id = ?');

// GET /tracks?user_id=xxx - get all cached pages for a user
app.get('/tracks', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const rows = getAllTracksPagesStmt.all(user_id);
  const now = Date.now();

  // If any page is expired, invalidate the entire cache for this user
  if (rows.length > 0 && rows.some(r => now - r.updated_at > TRACKS_TTL)) {
    deleteUserTracksStmt.run(user_id);
    return res.json({ cached: false, pages: [] });
  }

  if (rows.length === 0) {
    return res.json({ cached: false, pages: [] });
  }

  const pages = rows.map(r => ({ page: r.page, tracks: JSON.parse(r.data) }));
  res.json({ cached: true, pages });
});

// POST /tracks - store pages of tracks for a user
app.post('/tracks', (req, res) => {
  const { user_id, pages } = req.body; // pages: [{ page: 0, tracks: [...] }]
  if (!user_id || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'user_id and pages array required' });
  }

  const now = Date.now();
  const storeMany = db.transaction((items) => {
    for (const { page, tracks } of items) {
      upsertTracksStmt.run(user_id, page, JSON.stringify(tracks), now);
    }
  });
  storeMany(pages);
  res.json({ stored: pages.length });
});

// --- Visits ---

const upsertVisitStmt = db.prepare(`
  INSERT INTO visits (user_id, first_seen, last_seen) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET last_seen = excluded.last_seen
`);
const countVisitsStmt = db.prepare('SELECT COUNT(*) as count FROM visits');

// POST /visit - record a unique visitor
app.post('/visit', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const now = Date.now();
  upsertVisitStmt.run(user_id, now, now);
  const { count } = countVisitsStmt.get();
  res.json({ count });
});

// GET /visits/count - get total unique visitors
app.get('/visits/count', (_req, res) => {
  const { count } = countVisitsStmt.get();
  res.json({ count });
});

// SPA fallback
app.get('*splat', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Genrexplore server running on port ${PORT}`);
});
