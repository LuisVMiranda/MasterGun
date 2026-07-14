import * as THREE from "three";
import { getProjectileVisualProfile } from "../assets/projectileProfiles.js";

export function createProjectileVisual(projectile) {
  const profile = getProjectileVisualProfile(projectile);
  const group = new THREE.Group();
  const color = projectile.color ?? profile.color;
  const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(profile.width, Math.max(0.02, profile.length - profile.width * 2), 4, 8), material);
  const trailMaterial = new THREE.MeshBasicMaterial({ color: projectile.color ?? profile.emissive, opacity: 0.48, transparent: true, depthWrite: false, toneMapped: false });
  const trail = new THREE.Mesh(new THREE.ConeGeometry(profile.trailWidth, profile.trail, 8, 1, true), trailMaterial);
  core.rotation.x = Math.PI / 2;
  trail.rotation.x = -Math.PI / 2;
  trail.position.z = -profile.trail * 0.5 - profile.length * 0.35;
  group.add(core, trail);
  group.userData.profile = profile;
  group.userData.projectile = projectile;
  group.userData.thinProjectile = Boolean(projectile.thin);
  return group;
}

export function createMuzzleFlash(projectile) {
  const profile = getProjectileVisualProfile(projectile);
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: projectile.color ?? profile.color, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(profile.flash, profile.flash * 1.8, 8), material);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(profile.flash * 0.7, profile.flash * 0.08, 5, 16), material);
  cone.rotation.x = Math.PI / 2;
  cone.position.z = profile.flash * 0.8;
  ring.position.z = profile.flash * 0.15;
  group.add(cone, ring);
  group.userData.ttl = 0.09;
  return group;
}

export function createImpactVisual(projectile) {
  const profile = getProjectileVisualProfile(projectile);
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: projectile.color ?? profile.color, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
  const count = profile.impact === "burst" ? 10 : profile.impact === "pierce" ? 5 : 7;
  for (let index = 0; index < count; index += 1) {
    const spark = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.26), material);
    spark.rotation.set(index * 0.7, index * 1.3, index * 0.9);
    spark.position.set(Math.sin(index) * 0.12, Math.cos(index * 1.7) * 0.12, 0);
    group.add(spark);
  }
  group.userData.ttl = 0.28;
  return group;
}

export function createProjectileVfxManager(scene) {
  const active = [];
  const pending = [];
  const spawn = (projectile, origin, impact, delay = 0.38) => {
    active.push(addEffect(scene, createMuzzleFlash(projectile), origin));
    pending.push({ delay, impact, projectile });
  };
  const update = (dt) => {
    updatePending(scene, pending, active, dt);
    updateActive(scene, active, dt);
  };
  const spawnMuzzle = (projectile, origin) => active.push(addEffect(scene, createMuzzleFlash(projectile), origin));
  const spawnImpact = (projectile, impact) => active.push(addEffect(scene, createImpactVisual(projectile), impact));
  const dispose = () => {
    pending.length = 0;
    active.splice(0).forEach((effect) => disposeEffect(scene, effect));
  };
  return Object.freeze({ spawn, spawnImpact, spawnMuzzle, update, dispose });
}

function addEffect(scene, effect, position) {
  effect.position.copy(position);
  effect.userData.age = 0;
  scene.add(effect);
  return effect;
}

function updatePending(scene, pending, active, dt) {
  pending.forEach((item) => { item.delay -= dt; });
  const ready = pending.filter((item) => item.delay <= 0);
  ready.forEach((item) => active.push(addEffect(scene, createImpactVisual(item.projectile), item.impact)));
  pending.splice(0, pending.length, ...pending.filter((item) => item.delay > 0));
}

function updateActive(scene, active, dt) {
  active.forEach((effect) => animateEffect(effect, dt));
  const expired = active.filter((effect) => effect.userData.age >= effect.userData.ttl);
  expired.forEach((effect) => disposeEffect(scene, effect));
  active.splice(0, active.length, ...active.filter((effect) => effect.userData.age < effect.userData.ttl));
}

function animateEffect(effect, dt) {
  effect.userData.age += dt;
  const progress = Math.min(1, effect.userData.age / effect.userData.ttl);
  effect.scale.setScalar(1 + progress * 0.75);
  effect.children.forEach((child) => { child.material.opacity = 1 - progress; });
}

function disposeEffect(scene, effect) {
  scene.remove(effect);
  effect.traverse((object) => {
    object.geometry?.dispose?.();
    object.material?.dispose?.();
  });
}
