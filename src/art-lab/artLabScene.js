import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ENTITY } from "../game/content/constants.js";
import { getQualityProfile } from "../render/assets/qualityProfiles.js";
import { createProjectilePool } from "../render/objects/projectilePool.js";
import { createProjectileVfxManager } from "../render/objects/approvedProjectiles.js";
import { animateApprovedOperator, createApprovedOperator } from "../render/objects/approvedOperator.js";
import { createOperatorLodFormation } from "../render/objects/operatorLod.js";
import { animateFloorPickup, createBrickWall, createFloorPickup, createOccludedAssetHint, createPostedGate, getOccludedPlacementZ } from "../render/objects/approvedStructures.js";
import { animateApprovedWeapon, createApprovedWeapon, APPROVED_WEAPON_IDS } from "../render/objects/approvedWeapons.js";
import { createEntityObject, createSoldierObject } from "../render/objects/actors.js";
import { createWeaponObject } from "../render/objects/weapons.js";
import { animateHumanoid } from "../render/objects/humanoidMotion.js";
import { isProductionRender } from "./renderMode.js";

export function createArtLabScene(host, initialState, onMetrics) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  const renderer = createRenderer(host);
  const controls = createControls(camera, renderer.domElement);
  const stage = new THREE.Group();
  const actors = [];
  const pickups = [];
  const occlusionHints = [];
  const weapons = [];
  const projectilePool = createProjectilePool(scene);
  const effects = createProjectileVfxManager(scene);
  const content = { actors, effects, occlusionHints, pickups, projectilePool, stage, weapons };
  const runtime = { frame: 0, frameMs: 0, lastMetricAt: 0, lastTime: performance.now(), running: !initialState.paused, state: { ...initialState } };
  const disposeResize = bindResize(host, renderer, camera);

  scene.add(stage);
  addEnvironment(scene);
  applyQuality(renderer, scene, runtime.state.quality);
  rebuildStage(content, runtime.state);
  frameCamera(camera, controls, runtime.state);

  const loop = (now) => {
    const frameMs = now - runtime.lastTime;
    const dt = Math.min(0.05, frameMs / 1000);
    runtime.lastTime = now;
    updateScene(content, runtime.state, now * 0.001, dt);
    controls.autoRotate = runtime.state.turntable;
    controls.update();
    renderer.render(scene, camera);
    updateMetrics(renderer, runtime, now, frameMs, onMetrics);
    if (runtime.running) runtime.frame = requestAnimationFrame(loop);
  };
  runtime.frame = requestAnimationFrame(loop);
  const pause = () => {
    runtime.running = false;
    cancelAnimationFrame(runtime.frame);
  };
  const resume = () => {
    if (runtime.running) return;
    runtime.running = true;
    runtime.lastTime = performance.now();
    runtime.frame = requestAnimationFrame(loop);
  };
  const setState = (nextState) => {
    const previous = runtime.state;
    runtime.state = { ...previous, ...nextState };
    if (previous.quality !== runtime.state.quality) applyQuality(renderer, scene, runtime.state.quality);
    if (requiresStageRebuild(nextState)) rebuildStage(content, runtime.state);
    if (previous.variant !== runtime.state.variant || previous.asset !== runtime.state.asset) frameCamera(camera, controls, runtime.state);
  };
  const fireVolley = () => spawnVolley(content, runtime.state);
  const dispose = () => {
    cancelAnimationFrame(runtime.frame);
    disposeResize();
    controls.dispose();
    projectilePool.dispose();
    effects.dispose();
    renderer.dispose();
  };

  return Object.freeze({ setState, fireVolley, pause, resume, dispose, canvas: renderer.domElement });
}

function createRenderer(host) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance", stencil: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  return renderer;
}

function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 4;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.autoRotateSpeed = 0.65;
  return controls;
}

function addEnvironment(scene) {
  scene.fog = new THREE.Fog("#8cd9f5", 34, 108);
  scene.add(new THREE.HemisphereLight("#f4fcff", "#4e7180", 2.2));
  const sun = new THREE.DirectionalLight("#fff5dd", 3.1);
  sun.name = "art-lab-sun";
  sun.position.set(-12, 18, -8);
  sun.target.position.set(0, 0, 10);
  sun.castShadow = true;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  scene.add(createRunway());
}

function createRunway() {
  const runway = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.18, 88), new THREE.MeshStandardMaterial({ color: "#8ce7df", roughness: 0.9, metalness: 0 }));
  const railGeometry = new THREE.BoxGeometry(0.24, 0.42, 88);
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#edf7f7", roughness: 0.5 });
  const left = new THREE.Mesh(railGeometry, railMaterial);
  const right = left.clone();
  floor.position.set(0, -0.12, 24);
  floor.receiveShadow = true;
  left.position.set(-5.1, 0.1, 24);
  right.position.set(5.1, 0.1, 24);
  left.castShadow = true;
  right.castShadow = true;
  runway.add(floor, left, right);
  return runway;
}

function rebuildStage(content, state) {
  disposeChildren(content.stage);
  content.actors.length = 0;
  content.pickups.length = 0;
  content.occlusionHints.length = 0;
  content.weapons.length = 0;
  const builder = { showcase: buildShowcase, runway: buildRunway, stress: buildStress }[state.variant] ?? buildShowcase;
  builder({ ...content, state });
}

function buildShowcase(context) {
  const asset = context.state.asset ?? "all";
  if (asset === "all") {
    APPROVED_WEAPON_IDS.forEach((id, index) => addWeapon(context, id, [-3.3 + index * 2.15, 0.24, -0.8]));
    addOperator(context, [-2.5, 0, 2.4], "enemy");
    addOperator(context, [-1, 0, 2.4], "soldier");
    addStructure(context, "gate", [0.8, 0, 2.6]);
    addStructure(context, "wall", [3, 0, 2.6]);
    return;
  }
  if (APPROVED_WEAPON_IDS.includes(asset)) addWeapon(context, asset, [0, 0.28, 0], 1.45);
  else if (asset === "operator") addOperator(context, [0, 0, 0], context.state.faction, 1.6);
  else if (asset === "wall") addWallInspection(context);
  else addStructure(context, asset, [0, 0, 0], 1.35);
}

function buildRunway(context) {
  addWeapon(context, context.state.weaponId, [0, 0.22, -1.5], 1.08);
  addStructure(context, "pickup", [-2.6, 0, 3.6]);
  addStructure(context, "gate", [2.6, 0, 6.8]);
  addOperator(context, [-1.8, 0, 10], "enemy");
  addOperatorFormation(context, [
    { x: 1.4, z: 13.2, faction: "enemy", scale: 0.92 },
    { x: -3, z: 21, faction: "soldier", scale: 0.88 },
  ]);
  const wall = addStructure(context, "wall", [0, 0, 17]);
  addOccludedOperator(context, wall, 0.25);
}

function buildStress(context) {
  const items = [];
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 5 - 2) * 1.65;
    const z = Math.floor(index / 5) * 3.2 + 2;
    const faction = index % 4 === 0 ? "soldier" : "enemy";
    items.push({ x, z, faction, scale: 0.82 });
  }
  addOperatorFormation(context, items);
  for (let index = 0; index < 5; index += 1) {
    addStructure(context, index % 2 ? "gate" : "wall", [(index % 3 - 1) * 3, 0, 19 + index * 3], 0.9);
  }
}

function addWeapon(context, id, position, scale = 0.72) {
  const object = isProductionRender(context.state.renderStyle) ? createWeaponObject(id, { scale }) : createApprovedWeapon(id, { scale });
  object.position.set(...position);
  object.userData.baseZ = object.position.z;
  context.stage.add(object);
  context.weapons.push(object);
}

function addOperator(context, position, faction, scale = 1) {
  const object = createArtLabOperator(context, { faction, scale, unitKind: context.state.unitKind });
  object.position.set(...position);
  if (faction === "soldier") object.rotation.y = Math.PI;
  context.stage.add(object);
  context.actors.push(object);
  return object;
}

function addStructure(context, kind, position, scale = 1) {
  const object = isProductionRender(context.state.renderStyle) ? createProductionStructure(kind, context.state) : createPrototypeStructure(kind, context.state);
  object.position.set(...position);
  object.scale.setScalar(scale);
  context.stage.add(object);
  if (kind === "pickup") context.pickups.push(object);
  return object;
}

function addWallInspection(context) {
  const wall = addStructure(context, "wall", [0, 0, 0], 1.35);
  addOccludedOperator(context, wall, 0.18, 1.18);
}

function addOperatorFormation(context, items) {
  const formation = isProductionRender(context.state.renderStyle)
    ? createProductionOperatorFormation(context, items)
    : createOperatorLodFormation(items);
  context.stage.add(formation);
  return formation;
}

function createProductionOperatorFormation(context, items) {
  const formation = new THREE.Group();
  items.forEach((item) => {
    const actor = createArtLabOperator(context, item);
    actor.position.set(item.x, 0, item.z);
    if (item.faction === "soldier") actor.rotation.y = Math.PI;
    formation.add(actor);
    context.actors.push(actor);
  });
  formation.userData.productionFormation = true;
  return formation;
}

function createArtLabOperator(context, options) {
  if (isProductionRender(context.state.renderStyle)) {
    return createProductionOperator(options.faction, options.unitKind ?? context.state.unitKind);
  }
  return createApprovedOperator({ faction: options.faction, scale: options.scale });
}

function addOccludedOperator(context, wall, x, scale = 0.92) {
  if (isProductionRender(context.state.renderStyle)) return;
  const z = getOccludedPlacementZ(wall.position.z, { assetDepth: 0.44 * scale, wallDepth: 0.62 * wall.scale.z });
  const operator = addOperatorFormation(context, [{ x, z, faction: "enemy", scale }]);
  const hint = createOccludedAssetHint(operator, wall);
  context.occlusionHints.push({ hint, wall });
}

function createPrototypeStructure(kind, state) {
  if (kind === "gate") return createPostedGate({ type: state.gateType });
  if (kind === "wall") return createBrickWall(state.damage / 100);
  return createFloorPickup(state.pickupKind);
}

function createProductionOperator(faction, unitKind) {
  if (faction === "soldier") return createSoldierObject();
  if (unitKind === "boss") return createEntityObject(mockEntity(ENTITY.BOSS, faction));
  if (BOSS_FAMILIES.has(unitKind)) return createEntityObject({ ...mockEntity(ENTITY.BOSS, faction), bossFamily: unitKind });
  if (unitKind === "shooter") return createEntityObject(mockEntity(ENTITY.SHOOTER, faction));
  return createEntityObject({ ...mockEntity(ENTITY.ENEMY, faction), enemyKind: unitKind });
}

function createProductionStructure(kind, state) {
  if (kind === "gate") return createEntityObject({ ...mockEntity(ENTITY.GATE), gateType: state.gateType });
  if (kind === "wall") return createEntityObject(mockEntity(ENTITY.SOLID_WALL));
  return createEntityObject({ ...mockEntity(ENTITY.PICKUP), stat: "ammo" });
}

function mockEntity(type, faction = "enemy") {
  return { id: 1, type, label: faction === "soldier" ? "Soldier" : "Target", health: 100, maxHealth: 100, active: true, enemyKind: "runner", shooterKind: "still", width: 1, depth: 1 };
}

function updateScene(content, state, time, dt) {
  content.actors.forEach((actor) => animateArtLabActor(actor, state.animation, time));
  content.pickups.forEach((pickup) => animateFloorPickup(pickup, time));
  content.weapons.forEach((weapon) => animateApprovedWeapon(weapon, time, state.animation === "fire"));
  if (state.variant === "stress" && Math.floor(time * 6) !== Math.floor((time - dt) * 6)) spawnVolley(content, state);
  content.projectilePool.update(dt);
  content.effects.update(dt);
  content.occlusionHints.forEach(updateOcclusionHint);
  content.stage.rotation.y = state.turntable && state.variant === "showcase" ? Math.sin(time * 0.18) * 0.16 : 0;
}

function animateArtLabActor(actor, animation, time) {
  if (actor.userData.humanoid) {
    animateHumanoid(actor, PRODUCTION_MOTION_MAP[animation] ?? animation, time);
    return;
  }
  const prototypeMotion = PROTOTYPE_MOTION_MAP[animation] ?? animation;
  animateApprovedOperator(actor, prototypeMotion, animation === "backward" ? -time : time);
}

function updateOcclusionHint(entry) {
  const wallAlive = entry.wall.parent && entry.wall.userData.damageStage !== "collapsed";
  entry.hint.visible = Boolean(wallAlive);
}

function spawnVolley(content, state) {
  const ids = state.variant === "stress" ? ["pistol", "shotgun", "machineGun", "rifle", "soldier", "enemy"] : [state.weaponId];
  ids.forEach((id, index) => {
    const x = (index - (ids.length - 1) / 2) * 0.52;
    const origin = new THREE.Vector3(x, 0.72 + (index % 2) * 0.18, -1.2);
    content.projectilePool.spawn(id, origin, 8 + index * 0.8, state.thinProjectiles);
    if (state.variant !== "stress") content.effects.spawn({ owner: getProjectileOwner(id), weaponId: id }, origin, new THREE.Vector3(x, 0.78, 8.6), 0.42 + index * 0.025);
  });
}

function getProjectileOwner(id) {
  if (id === "soldier") return "soldier";
  if (id === "enemy") return "enemy";
  return "player";
}

function frameCamera(camera, controls, state) {
  const frames = {
    showcase: { camera: [7.8, 5.1, -9.6], target: [0, 0.92, 0.9] },
    runway: { camera: [0, 4.8, -8.8], target: [0, 0.65, 11] },
    stress: { camera: [8.8, 8.4, -12.8], target: [0, 0.8, 9] },
  };
  const frame = getInspectionFrame(state) ?? frames[state.variant] ?? frames.showcase;
  camera.position.set(...frame.camera);
  controls.target.set(...frame.target);
  controls.update();
}

function getInspectionFrame(state) {
  if (state.variant !== "showcase" || state.asset === "all") return null;
  if (state.asset === "operator" && (state.unitKind === "boss" || BOSS_FAMILIES.has(state.unitKind))) return { camera: [5.3, 4.4, -8.2], target: [0, 1.7, 0] };
  if (state.asset === "operator") return { camera: [3.1, 2.45, -4.5], target: [0, 0.92, 0] };
  if (APPROVED_WEAPON_IDS.includes(state.asset)) return { camera: [3.5, 2.35, -4.1], target: [0, 0.42, 0.35] };
  return { camera: [3.8, 2.8, -5.4], target: [0, 1, 0] };
}

function applyQuality(renderer, scene, id) {
  const profile = getQualityProfile(id);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatio));
  const sun = scene.getObjectByName("art-lab-sun");
  if (sun) sun.shadow.mapSize.set(profile.shadowMap, profile.shadowMap);
}

function updateMetrics(renderer, runtime, now, frameMs, callback) {
  runtime.frameMs = runtime.frameMs * 0.85 + Math.min(frameMs, 100) * 0.15;
  if (now - runtime.lastMetricAt < 300) return;
  const info = renderer.info;
  callback({
    calls: info.render.calls,
    triangles: info.render.triangles,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    frameMs: runtime.frameMs,
    fps: runtime.frameMs > 0 ? 1000 / runtime.frameMs : 0,
  });
  runtime.lastMetricAt = now;
}

function bindResize(host, renderer, camera) {
  const resize = () => {
    const rect = host.getBoundingClientRect();
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return () => observer.disconnect();
}

function disposeChildren(group) {
  const children = [...group.children];
  group.remove(...children);
  children.filter((child) => child.userData.prototypeAsset).forEach(disposeObjectTree);
}

function requiresStageRebuild(nextState) {
  return Object.keys(nextState).some((key) => STAGE_STATE_KEYS.has(key));
}

function disposeObjectTree(root) {
  root.traverse(disposeRenderable);
}

function disposeRenderable(object) {
  object.geometry?.dispose?.();
  disposeMaterial(object.material);
}

function disposeMaterial(material) {
  if (Array.isArray(material)) material.forEach((item) => item.dispose());
  else material?.dispose?.();
}

const STAGE_STATE_KEYS = new Set(["asset", "damage", "faction", "gateType", "pickupKind", "renderStyle", "unitKind", "variant", "weaponId"]);
const PRODUCTION_MOTION_MAP = Object.freeze({ run: "forward", strafeLeft: "left", strafeRight: "right", fire: "aim", reload: "idle" });
const PROTOTYPE_MOTION_MAP = Object.freeze({ forward: "run", backward: "run", left: "strafeLeft", right: "strafeRight" });
const BOSS_FAMILIES = new Set(["ironWarden", "arcDuelist", "triCannon", "skyTempest", "reclaimer"]);
