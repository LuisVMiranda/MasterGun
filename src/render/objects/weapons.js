import * as THREE from "three";

const materials = {
  steel: new THREE.MeshStandardMaterial({ color: "#253044", metalness: 0.62, roughness: 0.28 }),
  dark: new THREE.MeshStandardMaterial({ color: "#111827", metalness: 0.35, roughness: 0.34 }),
  grip: new THREE.MeshStandardMaterial({ color: "#7a5751", roughness: 0.62 }),
  accent: new THREE.MeshStandardMaterial({ color: "#ffcf3a", emissive: "#5b3b00", emissiveIntensity: 0.16, roughness: 0.35 }),
};

export function createWeaponObject(weaponId = "pistol", options = {}) {
  const group = new THREE.Group();
  const scale = options.scale ?? 1;
  const factory = getWeaponFactory(weaponId);

  factory(group);
  group.scale.setScalar(scale);
  group.userData.weaponId = weaponId;
  return group;
}

function getWeaponFactory(weaponId) {
  const factories = {
    shotgun: buildShotgun,
    machineGun: buildMachineGun,
    rifle: buildRifle,
    pistol: buildPistol,
  };
  return factories[weaponId] ?? factories.pistol;
}

function buildPistol(group) {
  addBox(group, { size: [0.46, 0.28, 0.58], position: [0, 0.34, 0.12], material: materials.steel });
  addBarrel(group, { radius: 0.075, length: 0.92, position: [0, 0.44, 0.74] });
  addBox(group, { size: [0.24, 0.52, 0.24], position: [0, 0.06, -0.15], rotation: [-0.42, 0, 0], material: materials.grip });
}

function buildShotgun(group) {
  addBox(group, { size: [0.72, 0.26, 0.58], position: [0, 0.35, 0.08], material: materials.dark });
  addBarrel(group, { radius: 0.07, length: 1.5, position: [-0.12, 0.48, 0.88] });
  addBarrel(group, { radius: 0.07, length: 1.5, position: [0.12, 0.48, 0.88] });
  addBox(group, { size: [0.56, 0.16, 0.46], position: [0, 0.23, 0.5], material: materials.grip });
  addBox(group, { size: [0.42, 0.3, 0.42], position: [0, 0.2, -0.36], rotation: [-0.22, 0, 0], material: materials.grip });
}

function buildMachineGun(group) {
  addBox(group, { size: [0.58, 0.3, 0.72], position: [0, 0.36, 0.05], material: materials.steel });
  addBarrel(group, { radius: 0.06, length: 1.42, position: [0, 0.5, 0.92] });
  addBox(group, { size: [0.42, 0.5, 0.18], position: [0, 0.06, 0.06], material: materials.dark });
  addCylinder(group, { radius: 0.25, length: 0.18, position: [0.38, 0.34, 0.08], rotation: [0, 0, Math.PI / 2], material: materials.accent });
}

function buildRifle(group) {
  addBox(group, { size: [0.42, 0.24, 0.9], position: [0, 0.34, 0.12], material: materials.steel });
  addBarrel(group, { radius: 0.045, length: 1.82, position: [0, 0.47, 1.1] });
  addBox(group, { size: [0.24, 0.2, 0.42], position: [0, 0.68, 0.28], material: materials.dark });
  addCylinder(group, { radius: 0.12, length: 0.36, position: [0, 0.78, 0.52], rotation: [0, 0, Math.PI / 2], material: materials.dark });
  addBox(group, { size: [0.34, 0.26, 0.52], position: [0, 0.22, -0.48], rotation: [-0.18, 0, 0], material: materials.grip });
}

function addBarrel(group, config) {
  addCylinder(group, { ...config, rotation: [Math.PI / 2, 0, 0], material: materials.steel });
}

function addBox(group, config) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...config.size), config.material);
  place(mesh, config);
  group.add(mesh);
}

function addCylinder(group, config) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(config.radius, config.radius, config.length, 14), config.material);
  place(mesh, config);
  group.add(mesh);
}

function place(mesh, config) {
  mesh.position.set(...config.position);
  if (config.rotation) mesh.rotation.set(...config.rotation);
  mesh.castShadow = true;
}
