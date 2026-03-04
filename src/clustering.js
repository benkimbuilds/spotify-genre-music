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

    const PULL = 0.25;
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
    for (let i = 0; i < indices.length - 1; i++) {
      edges.push([indices[i], indices[i + 1]]);
    }
  }

  return { nodes, edges, genreColorMap };
}
