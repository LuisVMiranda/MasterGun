import * as THREE from "three";
import { COLORS, TRACK } from "../../game/content/constants.js";

const TILE_COUNT = 112;
const CLOUD_PUFFS = Object.freeze([
  { x: -1.65, y: -0.08, z: 0, scale: [1.8, 0.36, 0.78], shade: true },
  { x: -0.85, y: 0.14, z: -0.08, scale: [1.45, 0.55, 0.82], shade: false },
  { x: 0, y: 0.26, z: 0.04, scale: [1.8, 0.68, 0.92], shade: false },
  { x: 0.92, y: 0.12, z: -0.05, scale: [1.55, 0.5, 0.78], shade: false },
  { x: 1.7, y: -0.08, z: 0.02, scale: [1.9, 0.34, 0.72], shade: true },
  { x: 0.18, y: -0.18, z: 0.22, scale: [2.35, 0.28, 0.62], shade: true },
]);
const CLOUD_LAYERS = Object.freeze([
  { count: 7, side: -1, x: 10.2, y: 10.6, z: 22, minZ: 12, spacing: 18, scale: 1.05, parallax: 0.06, speed: 0.5 },
  { count: 7, side: 1, x: 10, y: 10.2, z: 30, minZ: 14, spacing: 18, scale: 1.05, parallax: 0.06, speed: 0.46 },
  { count: 7, side: -1, x: 9.7, y: 4.6, z: 12, minZ: 8, spacing: 15, scale: 1.35, parallax: 0.1, speed: 0.7 },
  { count: 7, side: 1, x: 9.8, y: 4.2, z: 18, minZ: 8, spacing: 15, scale: 1.38, parallax: 0.1, speed: 0.66 },
  { count: 8, side: -1, x: 10.4, y: 1.25, z: 8, minZ: 5, spacing: 12, scale: 1.72, parallax: 0.15, speed: 0.88 },
  { count: 8, side: 1, x: 10.5, y: 1, z: 14, minZ: 5, spacing: 12, scale: 1.76, parallax: 0.15, speed: 0.82 },
]);

export function createWorld(scene) {
  const group = new THREE.Group();
  const tileMesh = createRunwayTiles();
  const rails = createRails();
  const finishLine = createFinishLine();
  const clouds = createClouds();

  group.add(clouds, tileMesh, rails, finishLine);
  scene.add(group);

  return {
    update(run) {
      updateTiles(tileMesh, run?.distance ?? 0);
      updateClouds(clouds, run, getSceneTime());
      finishLine.position.z = run ? run.profile.trackLength - run.distance : 120;
    },
  };
}

function createRunwayTiles() {
  const geometry = new THREE.BoxGeometry(TRACK.halfWidth * 2, 0.16, TRACK.tileLength * 0.96);
  const material = new THREE.MeshBasicMaterial({ color: COLORS.runway });
  const mesh = new THREE.InstancedMesh(geometry, material, TILE_COUNT);
  const matrix = new THREE.Matrix4();

  for (let index = 0; index < TILE_COUNT; index += 1) {
    matrix.makeTranslation(0, -0.12, index * TRACK.tileLength);
    mesh.setMatrixAt(index, matrix);
  }

  return mesh;
}

function updateTiles(mesh, distance) {
  const matrix = new THREE.Matrix4();
  const offset = -(distance % TRACK.tileLength);

  for (let index = 0; index < TILE_COUNT; index += 1) {
    matrix.makeTranslation(0, -0.12, offset + index * TRACK.tileLength);
    mesh.setMatrixAt(index, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

function createRails() {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.26, 0.5, TILE_COUNT * TRACK.tileLength);
  const material = new THREE.MeshStandardMaterial({ color: COLORS.rail, roughness: 0.45 });
  const left = new THREE.Mesh(geometry, material);
  const right = new THREE.Mesh(geometry, material);
  left.position.set(-TRACK.halfWidth - 0.18, 0.22, 150);
  right.position.set(TRACK.halfWidth + 0.18, 0.22, 150);
  left.castShadow = true;
  right.castShadow = true;
  group.add(left, right);
  return group;
}

function createFinishLine() {
  const group = new THREE.Group();
  const stripeGeometry = new THREE.BoxGeometry(TRACK.halfWidth * 2, 0.04, 0.34);
  const black = new THREE.MeshBasicMaterial({ color: "#111111" });
  const white = new THREE.MeshBasicMaterial({ color: "#f7fbff" });

  for (let index = 0; index < 10; index += 1) {
    const stripe = new THREE.Mesh(stripeGeometry, index % 2 ? black : white);
    stripe.position.set(0, 0.03, index * 0.34);
    group.add(stripe);
  }

  return group;
}

function createClouds() {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 16, 8);
  const materials = createCloudMaterials();
  let cloudIndex = 0;

  for (const layer of CLOUD_LAYERS) {
    for (let index = 0; index < layer.count; index += 1) {
      group.add(createCloud(geometry, materials, layer, index, cloudIndex));
      cloudIndex += 1;
    }
  }

  return group;
}

function createCloudMaterials() {
  return {
    bright: new THREE.MeshStandardMaterial({
      color: "#ffffff",
      depthWrite: false,
      opacity: 0.78,
      roughness: 1,
      transparent: true,
    }),
    shade: new THREE.MeshStandardMaterial({
      color: "#d7eef9",
      depthWrite: false,
      opacity: 0.58,
      roughness: 1,
      transparent: true,
    }),
  };
}

function createCloud(geometry, materials, layer, index, cloudIndex) {
  const group = new THREE.Group();

  for (let part = 0; part < CLOUD_PUFFS.length; part += 1) {
    const puff = createCloudPuff(geometry, materials, CLOUD_PUFFS[part], layer.scale, cloudIndex + part);
    group.add(puff);
  }

  setCloudBase(group, layer, index, cloudIndex);
  return group;
}

function createCloudPuff(geometry, materials, puffData, layerScale, seed) {
  const material = puffData.shade ? materials.shade : materials.bright;
  const puff = new THREE.Mesh(geometry, material);
  const scale = layerScale * seededRange(seed, 2, 0.9, 1.12);
  puff.scale.set(puffData.scale[0] * scale, puffData.scale[1] * scale, puffData.scale[2] * scale);
  puff.position.set(puffData.x * layerScale, puffData.y * layerScale, puffData.z * layerScale);
  return puff;
}

function setCloudBase(group, layer, index, cloudIndex) {
  const phase = cloudIndex * 0.73;
  const baseX = layer.side * (layer.x + seededRange(cloudIndex, 1, -0.7, 0.9));
  const baseY = layer.y + seededRange(cloudIndex, 3, -0.35, 0.45);
  const zBase = layer.z + index * layer.spacing + seededRange(cloudIndex, 4, -2.3, 2.3);

  group.position.set(baseX, baseY, zBase);
  group.userData = {
    baseX,
    baseY,
    bob: 0.6 + seededRange(cloudIndex, 5, 0, 0.2),
    drift: 0.34 + layer.scale * 0.18,
    loop: Math.max(32, layer.count * layer.spacing),
    minZ: layer.minZ,
    parallax: layer.parallax,
    phase,
    speed: layer.speed,
    zBase,
  };
}

function updateClouds(group, run, time) {
  const distance = run?.distance ?? time * 10;

  group.children.forEach((cloud, index) => {
    const data = cloud.userData;
    const travel = distance * data.parallax + time * data.speed;
    cloud.position.x = data.baseX + Math.sin(time * 0.32 + data.phase) * data.drift;
    cloud.position.y = data.baseY + Math.sin(time * data.bob + index) * 0.14;
    cloud.position.z = data.minZ + positiveModulo(data.zBase - travel - data.minZ, data.loop);
  });
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function seededRange(seed, salt, min, max) {
  const wave = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return min + (wave - Math.floor(wave)) * (max - min);
}

function getSceneTime() {
  return (globalThis.performance?.now?.() ?? Date.now()) * 0.001;
}
