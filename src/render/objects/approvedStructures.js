import * as THREE from "three";
import { WALL_UNIT_CLEARANCE } from "../../game/simulation/roundOcclusion.js";
import { addCylinder, addMesh, addRoundedBox } from "../assets/proceduralGeometry.js";
import { APPROVED_COLORS, createApprovedMaterials } from "../assets/approvedMaterials.js";

export const WALL_OCCLUSION_CLEARANCE = WALL_UNIT_CLEARANCE;

let wallStencilSequence = 0;

export function createPostedGate(options = {}) {
  const type = options.type ?? "buff";
  const materials = createApprovedMaterials();
  const group = new THREE.Group();
  const signal = type === "buff" ? materials.buff : materials.debuff;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 1.18, 0.08),
    new THREE.MeshPhysicalMaterial({ color: type === "buff" ? APPROVED_COLORS.buff : APPROVED_COLORS.debuff, emissive: type === "buff" ? "#087b34" : "#8b1027", emissiveIntensity: 0.35, opacity: 0.58, roughness: 0.2, transparent: true }),
  );

  addPost(group, -0.92, materials, signal);
  addPost(group, 0.92, materials, signal);
  panel.position.set(0, 1.12, 0);
  panel.receiveShadow = true;
  group.add(panel, createGateIcon(type, signal));
  group.userData.approvedAsset = true;
  group.userData.gateType = type;
  return group;
}

export function createBrickWall(healthRatio = 1) {
  const materials = createApprovedMaterials();
  const group = new THREE.Group();
  const rows = 5;
  const columns = 4;
  const geometry = new THREE.BoxGeometry(0.46, 0.4, 0.62, 2, 2, 2);
  const bricks = new THREE.InstancedMesh(geometry, materials.wall, rows * columns);
  const transform = new THREE.Object3D();
  const stencilRef = allocateWallStencilRef();

  bricks.castShadow = true;
  bricks.receiveShadow = true;
  bricks.renderOrder = 5;
  configureWallStencil(materials.wall, stencilRef);
  group.add(bricks);
  group.userData.approvedAsset = true;
  group.userData.frontZ = -0.325;
  group.userData.stencilRef = stencilRef;
  group.userData.wall = { bricks, columns, decorations: [], materials, transform };
  group.userData.dispose = () => disposeWall(group);
  updateBrickWall(group, healthRatio, true);
  return group;
}

export function updateBrickWall(group, healthRatio, force = false) {
  const wall = group.userData.wall;
  if (!wall) return;
  const stage = getWallDamageStage(healthRatio);
  if (!force && stage === group.userData.damageStage) return;
  updateBrickMatrices(wall, healthRatio);
  replaceWallDecorations(group, wall, healthRatio);
  group.userData.healthRatio = healthRatio;
  group.userData.damageStage = stage;
}

export function getWallDamageStage(healthRatio) {
  if (healthRatio <= 0) return "collapsed";
  if (healthRatio <= 0.2) return "critical";
  if (healthRatio <= 0.5) return "cracked";
  return "intact";
}

export function createFloorPickup(kind = "cash") {
  const materials = createApprovedMaterials();
  const group = new THREE.Group();
  const crate = addRoundedBox(group, { size: [0.72, 0.46, 0.62], position: [0, 0.23, 0], material: materials.olive, radius: 0.08, name: "pickup-crate", receiveShadow: true });
  addRoundedBox(group, { size: [0.76, 0.1, 0.66], position: [0, 0.28, 0], material: materials.steel, radius: 0.025, name: "crate-band" });
  const beacon = createPickupIcon(kind, materials);
  beacon.position.set(0, 1.12, 0);
  beacon.userData.floatBase = beacon.position.y;
  group.add(beacon);
  crate.userData.pickupKind = kind;
  group.userData.approvedAsset = true;
  group.userData.pickup = { beacon, kind };
  return group;
}

export function createOccludedAssetHint(source, wall) {
  const material = createOcclusionMaterial(wall.userData.stencilRef);
  const hint = createOuterContour(source, wall, material);
  hint.name = "occluded-asset-hint";
  hint.renderOrder = 20;
  hint.scale.multiplyScalar(1.025);
  hint.userData.approvedAsset = true;
  hint.userData.occlusionSource = source.uuid;
  hint.userData.occlusionWall = wall?.uuid ?? null;
  wall.add(hint);
  return hint;
}

export function getOccludedPlacementZ(wallZ, options = {}) {
  const wallDepth = options.wallDepth ?? 0.62;
  const assetDepth = options.assetDepth ?? 0.44;
  return wallZ + wallDepth * 0.5 + assetDepth * 0.5 + WALL_OCCLUSION_CLEARANCE;
}

export function animateFloorPickup(group, time) {
  const beacon = group.userData.pickup?.beacon;
  if (!beacon) return;
  beacon.position.y = beacon.userData.floatBase + Math.sin(time * 2.3) * 0.08;
  beacon.rotation.y = time * 0.8;
}

function addPost(group, x, materials, signal) {
  addRoundedBox(group, { size: [0.26, 1.92, 0.3], position: [x, 0.96, 0], material: materials.gatePost, radius: 0.055, name: "gate-post", receiveShadow: true });
  addRoundedBox(group, { size: [0.52, 0.16, 0.56], position: [x, 0.08, 0], material: materials.rubber, radius: 0.045, name: "post-foot", receiveShadow: true });
  addCylinder(group, { radius: 0.095, length: 0.08, position: [x, 1.98, 0], material: signal, name: "post-light" });
}

function createPickupIcon(kind, materials) {
  const icon = new THREE.Group();
  const signal = kind === "debuff" ? materials.debuff : materials.buff;
  const builder = PICKUP_ICON_BUILDERS[kind] ?? buildCashIcon;
  addPickupSign(icon, materials.armor, signal);
  addPickupGlyphFaces(icon, builder(materials, signal));
  icon.name = `pickup-icon-${kind}`;
  icon.scale.setScalar(1.3);
  return icon;
}

function addPickupSign(icon, background, rim) {
  addCylinder(icon, { radius: 0.34, length: 0.055, position: [0, 0, 0.08], rotation: [Math.PI / 2, 0, 0], material: background, name: "pickup-sign-backplate", castShadow: false, segments: 24 });
  addMesh(icon, new THREE.TorusGeometry(0.33, 0.022, 6, 24), { material: rim, position: [0, 0, 0.04], name: "pickup-sign-rim-front", castShadow: false });
  addMesh(icon, new THREE.TorusGeometry(0.33, 0.022, 6, 24), { material: rim, position: [0, 0, 0.12], name: "pickup-sign-rim-back", castShadow: false });
}

function addPickupGlyphFaces(icon, glyph) {
  const front = glyph;
  const back = glyph.clone(true);
  front.name = "pickup-glyph-front";
  front.position.z = 0.012;
  back.name = "pickup-glyph-back";
  back.position.z = 0.148;
  back.rotation.y = Math.PI;
  icon.add(front, back);
}

function buildCashIcon(materials, signal) {
  const glyph = new THREE.Group();
  addMesh(glyph, createCashNoteGeometry(), { material: flatMaterial(signal.color), name: "cash-note", castShadow: false });
  addMesh(glyph, new THREE.PlaneGeometry(0.075, 0.2), { material: flatMaterial(materials.warning.color), position: [0.015, -0.01, 0.004], name: "cash-band", castShadow: false });
  return glyph;
}

function createCashNoteGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.17, -0.13);
  shape.lineTo(0.21, -0.13);
  shape.lineTo(0.21, 0.03);
  shape.lineTo(0.18, 0.03);
  shape.lineTo(0.18, 0.08);
  shape.lineTo(0.15, 0.08);
  shape.lineTo(0.15, 0.13);
  shape.lineTo(-0.23, 0.13);
  shape.lineTo(-0.23, -0.03);
  shape.lineTo(-0.2, -0.03);
  shape.lineTo(-0.2, -0.08);
  shape.lineTo(-0.17, -0.08);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function buildAmmoIcon(materials, signal) {
  const glyph = new THREE.Group();
  const material = flatMaterial(signal.color);
  [-0.12, 0, 0.12].forEach((x) => {
    addMesh(glyph, createBulletGeometry(), { material, position: [x, 0, 0], name: "ammo-round", castShadow: false });
  });
  return glyph;
}

function buildPowerIcon(materials, signal) {
  const glyph = new THREE.Group();
  addMesh(glyph, createBoltGeometry(), { material: flatMaterial(signal.color), name: "power-bolt", castShadow: false });
  return glyph;
}

function buildDebuffIcon(materials, signal) {
  const glyph = new THREE.Group();
  addMesh(glyph, new THREE.CircleGeometry(0.2, 24), { material: flatMaterial(signal.color), name: "debuff-core", castShadow: false });
  addMesh(glyph, new THREE.PlaneGeometry(0.34, 0.075), { material: flatMaterial(materials.warning.color), position: [0, 0, 0.001], rotation: [0, 0, 0.72], name: "debuff-slash", castShadow: false });
  return glyph;
}

function flatMaterial(color) {
  return new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false });
}

function createBulletGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.045, -0.17);
  shape.lineTo(0.045, -0.17);
  shape.lineTo(0.045, 0.1);
  shape.lineTo(0, 0.18);
  shape.lineTo(-0.045, 0.1);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createBoltGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.04, 0.29);
  shape.lineTo(-0.18, 0.02);
  shape.lineTo(-0.035, 0.02);
  shape.lineTo(-0.12, -0.29);
  shape.lineTo(0.19, 0.075);
  shape.lineTo(0.045, 0.075);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createOcclusionMaterial(stencilRef) {
  return new THREE.LineDashedMaterial({
    color: "#ffffff",
    dashSize: 0.07,
    depthTest: false,
    gapSize: 0.06,
    opacity: 0.78,
    stencilFunc: THREE.EqualStencilFunc,
    stencilRef,
    stencilWrite: true,
    transparent: true,
  });
}

function createOuterContour(source, wall, material) {
  const points = collectRelativeVertices(source, wall);
  const contour = calculateBinnedContour(points, 18);
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(contour), material);
  line.computeLineDistances();
  line.position.z = wall.userData.frontZ;
  return line;
}

function collectRelativeVertices(source, relativeTo) {
  source.updateWorldMatrix(true, true);
  relativeTo.updateWorldMatrix(true, true);
  const inverse = relativeTo.matrixWorld.clone().invert();
  const points = [];
  source.traverse((object) => appendGeometryVertices(object, inverse, points));
  return points;
}

function appendGeometryVertices(object, inverse, points) {
  const positions = object.geometry?.attributes?.position;
  if (!positions) return;
  const transform = inverse.clone().multiply(object.matrixWorld);
  if (object.isInstancedMesh) {
    appendInstancedVertices(object, positions, transform, points);
    return;
  }
  appendPositionBuffer(positions, transform, points);
}

function appendInstancedVertices(object, positions, transform, points) {
  const instance = new THREE.Matrix4();
  for (let index = 0; index < object.count; index += 1) {
    object.getMatrixAt(index, instance);
    appendPositionBuffer(positions, transform.clone().multiply(instance), points);
  }
}

function appendPositionBuffer(positions, transform, points) {
  for (let index = 0; index < positions.count; index += 1) {
    points.push(new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(transform));
  }
}

function calculateBinnedContour(points, binCount) {
  const bounds = new THREE.Box3().setFromPoints(points);
  const bins = Array.from({ length: binCount }, () => ({ max: -Infinity, min: Infinity, y: 0 }));
  const height = Math.max(0.01, bounds.max.y - bounds.min.y);
  points.forEach((point) => includeContourPoint(bins, bounds.min.y, height, point));
  const valid = bins.filter((bin) => Number.isFinite(bin.min));
  const left = valid.map((bin) => new THREE.Vector3(bin.min, bin.y, 0));
  const right = [...valid].reverse().map((bin) => new THREE.Vector3(bin.max, bin.y, 0));
  return [...left, ...right];
}

function includeContourPoint(bins, minY, height, point) {
  const index = Math.min(bins.length - 1, Math.floor(((point.y - minY) / height) * bins.length));
  const bin = bins[index];
  bin.min = Math.min(bin.min, point.x);
  bin.max = Math.max(bin.max, point.x);
  bin.y = point.y;
}

function configureWallStencil(material, stencilRef) {
  material.stencilWrite = true;
  material.stencilRef = stencilRef;
  material.stencilFunc = THREE.AlwaysStencilFunc;
  material.stencilZPass = THREE.ReplaceStencilOp;
}

function allocateWallStencilRef() {
  wallStencilSequence = (wallStencilSequence % 254) + 1;
  return wallStencilSequence;
}

const PICKUP_ICON_BUILDERS = Object.freeze({ ammo: buildAmmoIcon, cash: buildCashIcon, power: buildPowerIcon, debuff: buildDebuffIcon });

function createGateIcon(type, material) {
  const icon = new THREE.Group();
  if (type === "buff") {
    addRoundedBox(icon, { size: [0.14, 0.64, 0.08], material, radius: 0.025, name: "plus-vertical" });
    addRoundedBox(icon, { size: [0.64, 0.14, 0.08], material, radius: 0.025, name: "plus-horizontal" });
  } else {
    addRoundedBox(icon, { size: [0.68, 0.15, 0.08], material, radius: 0.025, name: "minus" });
  }
  icon.position.set(0, 1.12, -0.08);
  return icon;
}

function positionBrick(transform, index, columns, ratio) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const offset = row % 2 ? 0.12 : -0.12;
  transform.position.set((column - 1.5) * 0.48 + offset, 0.22 + row * 0.41, 0);
  transform.rotation.set(0, 0, 0);
  transform.scale.set(1, 1, 1);
  if (ratio > 0.2 || ![3, 7, 14].includes(index)) return;
  transform.position.y -= 0.28 + (index % 2) * 0.16;
  transform.rotation.z = (index % 2 ? -1 : 1) * 0.18;
}

function updateBrickMatrices(wall, ratio) {
  for (let index = 0; index < wall.bricks.count; index += 1) {
    positionBrick(wall.transform, index, wall.columns, ratio);
    wall.transform.updateMatrix();
    wall.bricks.setMatrixAt(index, wall.transform.matrix);
  }
  wall.bricks.instanceMatrix.needsUpdate = true;
}

function replaceWallDecorations(group, wall, ratio) {
  wall.decorations.forEach((object) => {
    group.remove(object);
    object.geometry?.dispose();
  });
  const childCount = group.children.length;
  addCracks(group, ratio, wall.materials.mortar);
  addWallDebris(group, ratio, wall.materials.wall);
  wall.decorations = group.children.slice(childCount);
}

function disposeWall(group) {
  const geometries = new Set();
  const materials = new Set();
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function addCracks(group, ratio, material) {
  if (ratio > 0.5) return;
  const crackPaths = [
    [[0.18, 1.84], [-0.08, 1.51], [0.2, 1.2], [-0.04, 0.86]],
    [[-0.68, 1.2], [-0.42, 0.98], [-0.62, 0.66]],
  ];
  crackPaths.forEach((path) => addCrackPath(group, path, material));
}

function addCrackPath(group, path, material) {
  for (let index = 1; index < path.length; index += 1) {
    const [startX, startY] = path[index - 1];
    const [endX, endY] = path[index];
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    addRoundedBox(group, { size: [0.035, length, 0.03], position: [(startX + endX) / 2, (startY + endY) / 2, -0.33], rotation: [0, 0, -Math.atan2(dx, dy)], material, radius: 0.012, name: "wall-crack", castShadow: false });
  }
}

function addWallDebris(group, ratio, material) {
  if (ratio > 0.2) return;
  [[-0.72, 0.1, -0.24], [0.58, 0.08, 0.2], [0.14, 0.06, -0.38]].forEach((position, index) => {
    addMesh(group, new THREE.TetrahedronGeometry(0.12 + index * 0.025), { material, position, rotation: [index, 0.2, index * 0.6], name: "wall-debris", receiveShadow: true });
  });
}
