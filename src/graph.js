// src/graph.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, controls;
let instancedMesh, edgeLines;
let genreLabels = [];
let nodesData = [];
let raycaster, mouse;
let hoveredIndex = -1;
let audioEl = null;
let cameraAnim = null;
let onGenreClickCallback = null;
let onTrackClickCallback = null;

export function onGenreClick(callback) {
  onGenreClickCallback = callback;
}

export function onTrackClick(callback) {
  onTrackClickCallback = callback;
}

export function focusOnPoint(pos) {
  const dir = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  const currentDist = camera.position.length();
  const targetPos = dir.clone().multiplyScalar(currentDist);

  cameraAnim = {
    from: camera.position.clone(),
    to: targetPos,
    targetFrom: controls.target.clone(),
    targetTo: new THREE.Vector3(0, 0, 0),
    t: 0,
  };
}

const tooltip = document.getElementById('tooltip');
const trackDetail = document.getElementById('track-detail');
const detailArt = document.getElementById('detail-art');
const detailName = document.getElementById('detail-name');
const detailArtist = document.getElementById('detail-artist');
const detailAlbum = document.getElementById('detail-album');
const detailClose = document.getElementById('detail-close');

const NODE_RADIUS = 0.6;
const HOVER_SCALE = 2.0;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

export function initScene(canvas) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.Fog(0x0a0a0a, 80, 200);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 0, 120);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  canvas.parentElement.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 20;
  controls.maxDistance = 250;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 50, 50);
  scene.add(dirLight);

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 1 };
  mouse = new THREE.Vector2();

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);
  detailClose.addEventListener('click', () => {
    trackDetail.classList.add('hidden');
    if (audioEl) { audioEl.pause(); audioEl = null; }
  });

  animate();
}

export function renderGraph({ nodes, edges }) {
  nodesData = nodes;

  if (instancedMesh) scene.remove(instancedMesh);
  if (edgeLines) scene.remove(edgeLines);

  const geo = new THREE.SphereGeometry(NODE_RADIUS, 12, 8);
  const mat = new THREE.MeshLambertMaterial();
  instancedMesh = new THREE.InstancedMesh(geo, mat, nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    dummy.position.set(n.x, n.y, n.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
    color.setHex(n.color);
    instancedMesh.setColorAt(i, color);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.instanceColor.needsUpdate = true;
  scene.add(instancedMesh);

  if (edges.length > 0) {
    const positions = [];
    for (const [a, b] of edges) {
      positions.push(nodes[a].x, nodes[a].y, nodes[a].z);
      positions.push(nodes[b].x, nodes[b].y, nodes[b].z);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.12, transparent: true, fog: true });
    edgeLines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(edgeLines);
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Smooth camera animation
  if (cameraAnim) {
    cameraAnim.t += 0.02;
    if (cameraAnim.t >= 1) {
      camera.position.copy(cameraAnim.to);
      controls.target.copy(cameraAnim.targetTo);
      cameraAnim = null;
    } else {
      const t = easeInOut(cameraAnim.t);
      camera.position.lerpVectors(cameraAnim.from, cameraAnim.to, t);
      controls.target.lerpVectors(cameraAnim.targetFrom, cameraAnim.targetTo, t);
    }
    controls.update();
  }

  // Fade genre labels based on distance from camera (match fog)
  for (const label of genreLabels) {
    const dist = camera.position.distanceTo(label.position);
    const opacity = 1 - THREE.MathUtils.smoothstep(dist, 80, 200);
    label.element.style.opacity = opacity;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function focusOnGenre(anchorPos) {
  const dir = new THREE.Vector3(anchorPos.x, anchorPos.y, anchorPos.z).normalize();
  const currentDist = camera.position.length();
  const targetPos = dir.clone().multiplyScalar(currentDist);

  cameraAnim = {
    from: camera.position.clone(),
    to: targetPos,
    targetFrom: controls.target.clone(),
    targetTo: new THREE.Vector3(0, 0, 0),
    t: 0,
  };
}

export function resetCameraFocus() {
  cameraAnim = {
    from: camera.position.clone(),
    to: new THREE.Vector3(0, 0, 120),
    targetFrom: controls.target.clone(),
    targetTo: new THREE.Vector3(0, 0, 0),
    t: 0,
  };
}

function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(instancedMesh);

  if (hoveredIndex >= 0) {
    setInstanceScale(hoveredIndex, 1);
    hoveredIndex = -1;
  }

  if (intersects.length > 0) {
    const idx = intersects[0].instanceId;
    hoveredIndex = idx;
    setInstanceScale(idx, HOVER_SCALE);

    const track = nodesData[idx];
    tooltip.innerHTML = `<div class="track-name">${track.name}</div><div class="track-artist">${track.artist}</div>`;
    tooltip.style.left = e.clientX + 12 + 'px';
    tooltip.style.top = e.clientY + 12 + 'px';
    tooltip.classList.remove('hidden');
    document.body.style.cursor = 'pointer';
  } else {
    tooltip.classList.add('hidden');
    document.body.style.cursor = 'default';
  }
}

function onClick(e) {
  if (hoveredIndex < 0) return;
  const track = nodesData[hoveredIndex];

  if (track.albumArt) detailArt.src = track.albumArt;
  detailName.textContent = track.name;
  detailArtist.textContent = track.artist;
  detailAlbum.textContent = track.album || '';
  trackDetail.classList.remove('hidden');

  if (track.previewUrl) {
    if (audioEl) audioEl.pause();
    audioEl = new Audio(track.previewUrl);
    audioEl.volume = 0.5;
    audioEl.play().catch(() => {});
  }

  // Focus on the track's position and open its genre
  focusOnPoint(track);
  if (onTrackClickCallback) onTrackClickCallback(track);
}

function setInstanceScale(index, scale) {
  const matrix = new THREE.Matrix4();
  instancedMesh.getMatrixAt(index, matrix);
  const pos = new THREE.Vector3();
  pos.setFromMatrixPosition(matrix);
  dummy.position.copy(pos);
  dummy.scale.set(scale, scale, scale);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(index, dummy.matrix);
  instancedMesh.instanceMatrix.needsUpdate = true;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

export function renderGenreLabels(genreAnchors, genreColorMap) {
  // Remove old labels
  for (const label of genreLabels) scene.remove(label);
  genreLabels = [];

  for (const [genre, pos] of genreAnchors) {
    if (genre === 'unknown') continue;
    const div = document.createElement('div');
    div.className = 'genre-label';
    div.textContent = genre;
    const colorHex = '#' + (genreColorMap.get(genre) || 0xffffff).toString(16).padStart(6, '0');
    div.style.color = colorHex;

    div.addEventListener('click', () => {
      focusOnGenre(pos);
      if (onGenreClickCallback) onGenreClickCallback(genre);
    });

    const label = new CSS2DObject(div);
    const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1;
    const labelScale = (dist + 8) / dist;
    label.position.set(pos.x * labelScale, pos.y * labelScale, pos.z * labelScale);
    label.userData.genre = genre;

    scene.add(label);
    genreLabels.push(label);
  }
}

export function setGenreLabelVisibility(enabledGenres) {
  for (const label of genreLabels) {
    label.visible = enabledGenres.has(label.userData.genre);
  }
}

export function setNodeVisibility(visibleIndices) {
  for (let i = 0; i < nodesData.length; i++) {
    const visible = visibleIndices.has(i);
    const n = nodesData[i];
    dummy.position.set(
      visible ? n.x : 99999,
      visible ? n.y : 99999,
      visible ? n.z : 99999
    );
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}
