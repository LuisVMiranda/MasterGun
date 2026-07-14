import * as THREE from "three";
import { COLORS, TRACK } from "../../game/content/constants.js";

const TILE_COUNT = 112;
const NEAR_TILE_COUNT = 10;
const TOTAL_TILE_COUNT = TILE_COUNT + NEAR_TILE_COUNT;
export const RUNWAY_GEOMETRY = Object.freeze({
  tileDepthScale: 1.015,
  railWidth: 0.32,
  railHeight: 0.5,
  railOverlap: 0.04,
  railY: 0.21,
});
const CLOUD_PUFFS = Object.freeze([
  { x: -1.65, y: -0.08, z: 0, scale: [1.8, 0.36, 0.78], shade: true },
  { x: -0.85, y: 0.14, z: -0.08, scale: [1.45, 0.55, 0.82], shade: false },
  { x: 0, y: 0.26, z: 0.04, scale: [1.8, 0.68, 0.92], shade: false },
  { x: 0.92, y: 0.12, z: -0.05, scale: [1.55, 0.5, 0.78], shade: false },
  { x: 1.7, y: -0.08, z: 0.02, scale: [1.9, 0.34, 0.72], shade: true },
  { x: 0.18, y: -0.18, z: 0.22, scale: [2.35, 0.28, 0.62], shade: true },
]);
const CLOUD_LAYERS = Object.freeze([
  { count: 5, side: -1, x: 11.4, y: 10.2, z: 28, minZ: 11, spacing: 26, scale: 0.4, parallax: 0.014, speed: 0.08 },
  { count: 5, side: 1, x: 11.2, y: 9.8, z: 38, minZ: 12, spacing: 26, scale: 0.42, parallax: 0.014, speed: 0.07 },
  { count: 5, side: -1, x: 10.8, y: 6.2, z: 20, minZ: 7, spacing: 22, scale: 0.54, parallax: 0.022, speed: 0.1 },
  { count: 5, side: 1, x: 10.9, y: 5.8, z: 30, minZ: 7, spacing: 22, scale: 0.56, parallax: 0.022, speed: 0.09 },
  { count: 5, side: -1, x: 10.6, y: 3.4, z: 14, minZ: 4.5, spacing: 20, scale: 0.68, parallax: 0.032, speed: 0.12 },
  { count: 5, side: 1, x: 10.7, y: 3.2, z: 24, minZ: 4.5, spacing: 20, scale: 0.7, parallax: 0.032, speed: 0.11 },
  { count: 3, side: -1, x: 13.6, y: 7.3, z: 18, minZ: 7, spacing: 34, scale: 0.48, parallax: 0.01, speed: 0.045 },
  { count: 3, side: 1, x: 13.7, y: 7, z: 34, minZ: 7, spacing: 34, scale: 0.5, parallax: 0.01, speed: 0.04 },
  { count: 4, side: -1, x: 13.1, y: 2.2, z: 10, minZ: 3.4, spacing: 30, scale: 0.62, parallax: 0.018, speed: 0.06 },
  { count: 4, side: 1, x: 13.2, y: 2, z: 24, minZ: 3.4, spacing: 30, scale: 0.64, parallax: 0.018, speed: 0.055 },
]);

export function createWorld(scene) {
  const group = new THREE.Group();
  const tileMesh = createRunwayTiles();
  const rails = createRails();
  const finishLine = createFinishLine();
  const clouds = createClouds();
  const grass = createRunwayGrass();

  group.add(clouds, tileMesh, rails, finishLine, grass);
  scene.add(group);

  return {
    update(run) {
      updateTiles(tileMesh, run?.distance ?? 0);
      updateClouds(clouds, run, getSceneTime());
      updateRunwayGrass(grass, run?.distance ?? 0);
      finishLine.position.z = run ? run.profile.trackLength - run.distance : 120;
    },
  };
}

export function createRunwayGrass() {
  const count = 48;
  const geometry = new THREE.ConeGeometry(0.055, 0.18, 3);
  const material = new THREE.MeshStandardMaterial({ color: "#78cfa0", roughness: 1, transparent: true, opacity: 0.55 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.userData.count = count;
  mesh.userData.transform = {
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
  };
  updateRunwayGrass(mesh, 0);
  return mesh;
}

export function updateRunwayGrass(mesh, distance) {
  const { matrix, position, rotation, scale: scaleVector } = mesh.userData.transform;
  const loop = 210;
  for (let index = 0; index < mesh.userData.count; index += 1) {
    const side = index % 2 ? -1 : 1;
    const baseZ = 5 + index * 4.6;
    const z = 2 + positiveModulo(baseZ - distance - 2, loop);
    const edgeOffset = seededRange(index, 9, 0.18, 0.5);
    const x = side * (TRACK.halfWidth - edgeOffset);
    const scale = seededRange(index, 10, 0.65, 1.15);
    position.set(x, 0.05, z);
    scaleVector.setScalar(scale);
    matrix.compose(position, rotation, scaleVector);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function createRunwayTiles() {
  const geometry = new THREE.BoxGeometry(TRACK.halfWidth * 2, 0.16, TRACK.tileLength * RUNWAY_GEOMETRY.tileDepthScale);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.runway,
    emissive: COLORS.runway,
    emissiveIntensity: 0.16,
    metalness: 0,
    roughness: 1,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, TOTAL_TILE_COUNT);
  const matrix = new THREE.Matrix4();

  for (let index = 0; index < TOTAL_TILE_COUNT; index += 1) {
    matrix.makeTranslation(0, -0.12, getTileZ(index, 0));
    mesh.setMatrixAt(index, matrix);
  }

  mesh.receiveShadow = true;

  return mesh;
}

function updateTiles(mesh, distance) {
  const matrix = new THREE.Matrix4();
  const offset = -(distance % TRACK.tileLength);

  for (let index = 0; index < TOTAL_TILE_COUNT; index += 1) {
    matrix.makeTranslation(0, -0.12, getTileZ(index, offset));
    mesh.setMatrixAt(index, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

function createRails() {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(RUNWAY_GEOMETRY.railWidth, RUNWAY_GEOMETRY.railHeight, TOTAL_TILE_COUNT * TRACK.tileLength);
  const material = new THREE.MeshStandardMaterial({ color: COLORS.rail, roughness: 0.45 });
  const left = new THREE.Mesh(geometry, material);
  const right = new THREE.Mesh(geometry, material);
  const railZ = ((TILE_COUNT - NEAR_TILE_COUNT - 1) * TRACK.tileLength) / 2;
  const railX = TRACK.halfWidth + RUNWAY_GEOMETRY.railWidth / 2 - RUNWAY_GEOMETRY.railOverlap;
  left.position.set(-railX, RUNWAY_GEOMETRY.railY, railZ);
  right.position.set(railX, RUNWAY_GEOMETRY.railY, railZ);
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
    bright: new THREE.MeshBasicMaterial({
      color: "#dff3fb",
      depthWrite: false,
      opacity: 0.25,
      transparent: true,
    }),
    shade: new THREE.MeshBasicMaterial({
      color: "#b9e0ef",
      depthWrite: false,
      opacity: 0.13,
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
  const material = (puffData.shade ? materials.shade : materials.bright).clone();
  const puff = new THREE.Mesh(geometry, material);
  const scale = layerScale * seededRange(seed, 2, 0.9, 1.12);
  puff.scale.set(puffData.scale[0] * scale, puffData.scale[1] * scale, puffData.scale[2] * scale);
  puff.position.set(puffData.x * layerScale, puffData.y * layerScale, puffData.z * layerScale);
  puff.userData.baseOpacity = material.opacity;
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
    bob: 0.18 + seededRange(cloudIndex, 5, 0, 0.08),
    drift: 0.08 + layer.scale * 0.06,
    fadeRange: 5 + layer.scale * 7,
    loop: Math.max(42, layer.count * layer.spacing + Math.max(0, layer.z - layer.minZ)),
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
    cloud.position.y = data.baseY + Math.sin(time * data.bob + index) * 0.04;
    cloud.position.z = data.minZ + positiveModulo(data.zBase - travel - data.minZ, data.loop);
    fadeCloud(cloud, getNearFade(cloud.position.z, data));
  });
}

function fadeCloud(cloud, opacityScale) {
  cloud.children.forEach((puff) => {
    puff.material.opacity = puff.userData.baseOpacity * opacityScale;
  });
}

function getNearFade(z, data) {
  return smoothstep(clamp((z - data.minZ) / data.fadeRange, 0, 1));
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function getTileZ(index, offset) {
  return offset + (index - NEAR_TILE_COUNT) * TRACK.tileLength;
}

function seededRange(seed, salt, min, max) {
  const wave = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return min + (wave - Math.floor(wave)) * (max - min);
}

function getSceneTime() {
  return (globalThis.performance?.now?.() ?? Date.now()) * 0.001;
}
