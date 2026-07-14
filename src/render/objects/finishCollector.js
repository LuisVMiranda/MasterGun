import * as THREE from "three";
import { addCylinder, addMesh, addRoundedBox } from "../assets/proceduralGeometry.js";

export function createFinishCollector() {
  const group = new THREE.Group();
  const materials = createMaterials();
  const body = addCollectorBody(group, materials);
  const core = addCashCore(group, materials);
  const topCash = addTopCash(group, materials);
  const cracks = addCracks(group, materials.crack);
  group.name = "finish-cash-collector";
  group.userData.finishCollector = { body, core, cracks, materials, topCash };
  configureOutlines(group);
  updateFinishCollector(group, 1);
  return group;
}

export function updateFinishCollector(group, ratio) {
  const collector = group.userData.finishCollector;
  if (!collector) return;
  const health = THREE.MathUtils.clamp(ratio, 0, 1);
  const damage = 1 - health;
  collector.materials.core.emissiveIntensity = 0.42 + health * 0.72;
  collector.materials.gold.emissiveIntensity = 0.08 + health * 0.18;
  collector.cracks.visible = health <= 0.5;
  collector.cracks.children.forEach((part) => { part.material.opacity = Math.min(0.84, damage * 1.35); });
  collector.topCash.rotation.z = health <= 0.2 ? -0.16 : 0;
  collector.body.position.y = health <= 0.2 ? -0.025 : 0;
}

function addCollectorBody(group, materials) {
  const body = new THREE.Group();
  addRoundedBox(body, part([1.42, 0.2, 0.9], [0, 0.1, 0], materials.rubber, "collector-base", 0.07));
  addRoundedBox(body, part([1.22, 1.08, 0.72], [0, 0.72, 0], materials.steel, "collector-vault", 0.1));
  [-1, 1].forEach((side) => addRoundedBox(body, part([0.16, 1.18, 0.78], [side * 0.61, 0.68, 0], materials.steelLight, "collector-pillar", 0.05)));
  addRoundedBox(body, part([1.12, 0.1, 0.78], [0, 1.25, 0], materials.gold, "collector-crown", 0.04));
  group.add(body);
  return body;
}

function configureOutlines(group) {
  group.traverse((child) => {
    if (child.isMesh) child.userData.skipOutline = true;
  });
  ["collector-base", "collector-vault", "collector-pillar"].forEach((name) => {
    group.getObjectsByProperty("name", name).forEach((mesh) => { mesh.userData.skipOutline = false; });
  });
}

function addCashCore(group, materials) {
  const core = new THREE.Group();
  addRoundedBox(core, part([0.88, 0.5, 0.07], [0, 0.75, -0.39], materials.glass, "collector-window", 0.04));
  addMesh(core, new THREE.TorusGeometry(0.2, 0.035, 8, 24), detail({ material: materials.gold, position: [0, 0.77, -0.45], name: "collector-coin-ring" }));
  addCylinder(core, detail({ radius: 0.11, length: 0.045, segments: 18, material: materials.core, position: [0, 0.77, -0.48], rotation: [Math.PI / 2, 0, 0], name: "collector-coin-core" }));
  [-1, 0, 1].forEach((offset) => addRoundedBox(core, part([0.2, 0.08, 0.035], [offset * 0.22, 0.48, -0.45], materials.cash, "collector-bill", 0.015)));
  group.add(core);
  return core;
}

function addTopCash(group, materials) {
  const cash = new THREE.Group();
  for (let layer = 0; layer < 3; layer += 1) {
    const bill = addRoundedBox(cash, part([0.68, 0.09, 0.38], [0, layer * 0.08, 0], materials.cash, "collector-cash-stack", 0.025));
    bill.rotation.y = (layer - 1) * 0.06;
  }
  addRoundedBox(cash, part([0.72, 0.045, 0.08], [0, 0.1, 0], materials.gold, "collector-cash-band", 0.015));
  cash.position.set(0, 1.36, 0.02);
  group.add(cash);
  return cash;
}

function addCracks(group, material) {
  const cracks = new THREE.Group();
  const segments = [
    { position: [-0.2, 0.86, -0.435], rotation: 0.58 },
    { position: [-0.08, 0.72, -0.44], rotation: -0.42 },
    { position: [0.3, 0.58, -0.44], rotation: 0.72 },
  ];
  segments.forEach((segment, index) => {
    const crack = addMesh(cracks, new THREE.BoxGeometry(0.025, 0.3 - index * 0.04, 0.018), detail({ material, position: segment.position, name: "collector-crack" }));
    crack.rotation.z = segment.rotation;
  });
  group.add(cracks);
  return cracks;
}

function createMaterials() {
  return {
    steel: standard("#273642", 0.64, 0.3),
    steelLight: standard("#647985", 0.52, 0.34),
    rubber: standard("#10171d", 0.1, 0.82),
    cash: standard("#58c66f", 0.08, 0.48),
    glass: standard("#183b38", 0.42, 0.2),
    gold: emissive("#f3bd35", "#9b5c00", 0.24),
    core: emissive("#89ff9c", "#23d35c", 1.14),
    crack: new THREE.MeshBasicMaterial({ color: "#080d11", opacity: 0, transparent: true }),
  };
}

function standard(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function emissive(color, glow, intensity) {
  return new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: intensity, metalness: 0.3, roughness: 0.28 });
}

function part(size, position, material, name, radius) {
  return detail({ size, position, material, name, radius });
}

function detail(config) {
  return { ...config, castShadow: true };
}
