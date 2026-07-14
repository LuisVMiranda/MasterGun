import * as THREE from "three";

const FAMILY_COLORS = Object.freeze({
  ironWarden: "#ff3c35",
  arcDuelist: "#9d58ff",
  triCannon: "#ff9f2f",
  skyTempest: "#36d8ff",
  reclaimer: "#ff4fc8",
});

const geometry = {
  cannon: new THREE.CylinderGeometry(0.12, 0.16, 0.8, 10),
  orb: new THREE.OctahedronGeometry(0.28, 0),
  ring: new THREE.TorusGeometry(0.58, 0.055, 8, 24),
};

const materials = new Map();
const effectMaterials = new Map();

export function decorateBoss(group, entity) {
  const family = entity.bossFamily;
  if (!family) return;
  const material = getMaterial(family);
  const creators = {
    ironWarden: addWardenGear,
    arcDuelist: addDuelistGear,
    triCannon: addTriCannonGear,
    skyTempest: addTempestGear,
    reclaimer: addReclaimerGear,
  };
  creators[family]?.(group, material);
  addSkillEffects(group, material, family);
  group.userData.bossFamily = family;
}

export function updateBossVisual(group, entity, elapsed) {
  const effects = group.userData.bossEffects;
  if (!effects) return;
  effects.shield.visible = entity.skillState === "blocking";
  effects.heal.visible = entity.skillState === "healing";
  effects.armor.visible = entity.skillState === "armoring";
  effects.sweep.visible = entity.skillState === "sweeping";
  effects.shield.rotation.y = elapsed * 0.8;
  effects.heal.rotation.z = elapsed * 1.6;
  effects.armor.rotation.y = -elapsed * 1.2;
  effects.sweep.rotation.z = elapsed * 2.2;
  const pulse = 1 + Math.sin(elapsed * 7) * 0.08;
  effects.heal.scale.setScalar(pulse);
}

function addWardenGear(group, material) {
  const shield = createWardenShield(material);
  const shoulderArmor = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.42), material);
  shield.name = "warden-shield";
  shoulderArmor.name = "warden-shoulder-armor";
  shield.position.set(-0.72, 1.25, -0.08);
  shoulderArmor.position.set(0, 2.1, 0);
  group.add(shield, shoulderArmor);
}

function createWardenShield(material) {
  const shield = new THREE.Group();
  const rimMaterial = new THREE.MeshStandardMaterial({ color: "#222a35", metalness: 0.48, roughness: 0.28 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.18, 6), rimMaterial);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.2, 6), material);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.04), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  plate.rotation.x = Math.PI / 2;
  plate.position.z = -0.025;
  brace.position.z = -0.13;
  shield.add(rim, plate, brace);
  return shield;
}

function addDuelistGear(group, material) {
  [-1, 1].forEach((side) => {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 4), material);
    fin.name = `duelist-shoulder-${side < 0 ? "left" : "right"}`;
    fin.position.set(side * 0.62, 2.05, 0.02);
    fin.rotation.z = side * 0.42;
    group.add(fin);
  });
}

function addTriCannonGear(group, material) {
  [-0.46, 0, 0.46].forEach((x) => {
    const cannon = new THREE.Mesh(geometry.cannon, material);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(x, 2.05, -0.42);
    group.add(cannon);
  });
}

function addTempestGear(group, material) {
  const ring = new THREE.Mesh(geometry.ring, material);
  ring.name = "tempest-focus-ring";
  ring.position.set(0.72, 2.1, 0);
  group.add(ring);
}

function addReclaimerGear(group, material) {
  [-1, 0, 1].forEach((offset) => {
    const orb = new THREE.Mesh(geometry.orb, material);
    orb.position.set(offset * 0.58, 2.15 + Math.abs(offset) * 0.2, 0);
    group.add(orb);
  });
}

function addSkillEffects(group, familyMaterial, family) {
  const shieldMaterial = getEffectMaterial(family, familyMaterial);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 12), shieldMaterial);
  const heal = new THREE.Mesh(geometry.ring, familyMaterial);
  const armor = new THREE.Mesh(new THREE.IcosahedronGeometry(1.08, 1), shieldMaterial);
  const sweep = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 8, 30), familyMaterial);
  shield.position.y = 1.35;
  heal.position.y = 0.18;
  heal.rotation.x = Math.PI / 2;
  armor.position.y = 1.35;
  sweep.position.y = 1.45;
  sweep.rotation.x = Math.PI / 2;
  shield.visible = false;
  heal.visible = false;
  armor.visible = false;
  sweep.visible = false;
  group.add(shield, heal, armor, sweep);
  group.userData.bossEffects = { shield, heal, armor, sweep };
}

function getEffectMaterial(family, baseMaterial) {
  if (effectMaterials.has(family)) return effectMaterials.get(family);
  const material = baseMaterial.clone();
  material.opacity = 0.24;
  material.side = THREE.DoubleSide;
  material.transparent = true;
  effectMaterials.set(family, material);
  return material;
}

function getMaterial(family) {
  if (materials.has(family)) return materials.get(family);
  const color = FAMILY_COLORS[family] ?? "#ff3451";
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.24, metalness: 0.34, roughness: 0.28 });
  materials.set(family, material);
  return material;
}
