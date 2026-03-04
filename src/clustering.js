// src/clustering.js

const GENRE_COLORS = [
  0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0x6c5ce7,
  0xa29bfe, 0xfd79a8, 0x00b894, 0xe17055, 0x0984e3,
  0xfdcb6e, 0xe84393, 0x00cec9, 0xd63031, 0x74b9ff,
  0x55efc4, 0xffeaa7, 0xdfe6e9, 0xb2bec3, 0x636e72,
];

// Distribute genre anchors evenly on the sphere using golden spiral
function genreAnchors(genres, radius) {
  const anchors = new Map();
  const n = genres.length;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * i) / (n - 1 || 1); // -1 to 1
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    anchors.set(genres[i], {
      x: r * Math.cos(theta) * radius,
      y: y * radius,
      z: r * Math.sin(theta) * radius,
    });
  }
  return anchors;
}

export function computeLayout(library) {
  // Assign genre colors
  const genreSet = [...new Set(library.map(t => t.primaryGenre))];
  const genreColorMap = new Map();
  genreSet.forEach((genre, i) => {
    genreColorMap.set(genre, GENRE_COLORS[i % GENRE_COLORS.length]);
  });

  const RADIUS = 50;

  // Give each genre a fixed anchor point spread evenly on the sphere
  const anchors = genreAnchors(genreSet, RADIUS);

  // Start each node near its genre anchor with some spread from audio features
  const nodes = library.map(track => {
    const anchor = anchors.get(track.primaryGenre) || { x: 0, y: 0, z: 0 };

    // Use audio features (real or pseudo) to offset from the anchor
    const spread = 15;
    const ox = (track.energy - 0.5) * spread * 2;
    const oy = (track.valence - 0.5) * spread * 2;
    const oz = (track.danceability - 0.5) * spread * 2;

    return {
      ...track,
      x: anchor.x + ox,
      y: anchor.y + oy,
      z: anchor.z + oz,
      color: genreColorMap.get(track.primaryGenre) || 0x636e72,
    };
  });

  // Force simulation: pull toward genre anchor + repel from other nodes
  const ITERATIONS = 30;
  const ANCHOR_PULL = 0.08;
  const REPULSION = 2.0;
  const MIN_DIST = 1.5;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Pull toward genre anchor
    for (const node of nodes) {
      const anchor = anchors.get(node.primaryGenre);
      if (!anchor) continue;
      node.x += (anchor.x - node.x) * ANCHOR_PULL;
      node.y += (anchor.y - node.y) * ANCHOR_PULL;
      node.z += (anchor.z - node.z) * ANCHOR_PULL;
    }

    // Repel overlapping nodes so they don't pile up
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dz = nodes[j].z - nodes[i].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

        if (dist < MIN_DIST * 4) {
          const force = REPULSION / (dist * dist);
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          const fz = dz / dist * force;
          nodes[i].x -= fx;
          nodes[i].y -= fy;
          nodes[i].z -= fz;
          nodes[j].x += fx;
          nodes[j].y += fy;
          nodes[j].z += fz;
        }
      }
    }

    // Project back onto sphere surface (keeps the spherical shape)
    for (const node of nodes) {
      const dist = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z) || 1;
      const targetR = RADIUS + (node.danceability - 0.5) * 8;
      const blend = 0.3;
      const r = dist * (1 - blend) + targetR * blend;
      node.x = (node.x / dist) * r;
      node.y = (node.y / dist) * r;
      node.z = (node.z / dist) * r;
    }
  }

  // Build edges (same artist connections)
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

  return { nodes, edges, genreColorMap, genreAnchors: anchors };
}
