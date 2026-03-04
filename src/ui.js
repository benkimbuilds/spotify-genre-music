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
