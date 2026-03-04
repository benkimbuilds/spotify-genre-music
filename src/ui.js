// src/ui.js
import { setNodeVisibility, setGenreLabelVisibility, focusOnGenre, resetCameraFocus, onGenreClick, onTrackClick } from './graph.js';

const genrePanel = document.getElementById('genre-panel');
const genreList = document.getElementById('genre-list');
const genreTracks = document.getElementById('genre-tracks');
const genreTracksTitle = document.getElementById('genre-tracks-title');
const genreTracksList = document.getElementById('genre-tracks-list');
const genreTracksClose = document.getElementById('genre-tracks-close');

let nodesRef = [];
let genreEnabled = new Map();
let genreAnchorsRef = null;
let activeGenre = null;

export function initGenreFilter(nodes, genreColorMap, genreAnchors) {
  nodesRef = nodes;
  genreAnchorsRef = genreAnchors;
  genrePanel.classList.remove('hidden');
  genreList.innerHTML = '';

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
      <span class="genre-name">${genre} (${count})</span>
    `;
    item.querySelector('input').addEventListener('change', (e) => {
      e.stopPropagation();
      genreEnabled.set(genre, e.target.checked);
      updateVisibility();
    });
    // Click on the genre name to focus
    item.querySelector('.genre-name').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectGenre(genre);
    });
    genreList.appendChild(item);
  }

  // Close track list panel
  genreTracksClose.addEventListener('click', closeTrackList);

  // Wire up 3D label clicks
  onGenreClick((genre) => selectGenre(genre));

  // Wire up 3D track node clicks
  onTrackClick((track) => {
    // Open the genre panel for this track's genre (camera already focused by graph.js)
    selectGenre(track.primaryGenre, { skipCamera: true, highlightTrack: track.id });
  });
}

function selectGenre(genre, opts = {}) {
  const { skipCamera = false, highlightTrack = null } = opts;

  if (activeGenre === genre && !highlightTrack) {
    closeTrackList();
    return;
  }
  activeGenre = genre;

  if (!skipCamera) {
    const anchor = genreAnchorsRef?.get(genre);
    if (anchor) focusOnGenre(anchor);
  }

  showTrackList(genre, highlightTrack);
}

function showTrackList(genre, highlightTrackId = null) {
  const tracks = nodesRef.filter(n => n.primaryGenre === genre);
  genreTracksTitle.textContent = genre;

  genreTracksList.innerHTML = '';
  let highlightEl = null;

  for (const track of tracks) {
    const item = document.createElement('div');
    item.className = 'genre-track-item';
    if (track.id === highlightTrackId) {
      item.classList.add('genre-track-active');
      highlightEl = item;
    }
    item.innerHTML = `
      ${track.albumArt ? `<img class="genre-track-art" src="${track.albumArt}" />` : '<div class="genre-track-art"></div>'}
      <div class="genre-track-info">
        <div class="genre-track-name">${track.name}</div>
        <div class="genre-track-artist">${track.artist}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      const detailArt = document.getElementById('detail-art');
      const detailName = document.getElementById('detail-name');
      const detailArtist = document.getElementById('detail-artist');
      const detailAlbum = document.getElementById('detail-album');
      const trackDetail = document.getElementById('track-detail');

      if (track.albumArt) detailArt.src = track.albumArt;
      detailName.textContent = track.name;
      detailArtist.textContent = track.artist;
      detailAlbum.textContent = track.album || '';
      trackDetail.classList.remove('hidden');

      // Clear previous highlight, set new one
      genreTracksList.querySelectorAll('.genre-track-active').forEach(el => el.classList.remove('genre-track-active'));
      item.classList.add('genre-track-active');

      if (track.previewUrl) {
        const audio = new Audio(track.previewUrl);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    });
    genreTracksList.appendChild(item);
  }

  genreTracks.classList.remove('hidden');

  // Scroll to highlighted track
  if (highlightEl) {
    requestAnimationFrame(() => highlightEl.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }
}

function closeTrackList() {
  activeGenre = null;
  genreTracks.classList.add('hidden');
  resetCameraFocus();
}

function updateVisibility() {
  const visible = new Set();
  for (let i = 0; i < nodesRef.length; i++) {
    if (genreEnabled.get(nodesRef[i].primaryGenre)) {
      visible.add(i);
    }
  }
  setNodeVisibility(visible);
  const enabledGenres = new Set(
    [...genreEnabled.entries()].filter(([, v]) => v).map(([k]) => k)
  );
  setGenreLabelVisibility(enabledGenres);
}
