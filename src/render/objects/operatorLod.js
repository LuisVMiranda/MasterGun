import * as THREE from "three";
import { createApprovedMaterials } from "../assets/approvedMaterials.js";

const FORMATION_GROUND_OFFSET = 0.125;

export function createOperatorLodFormation(items) {
  const group = new THREE.Group();
  ["enemy", "soldier"].forEach((faction) => {
    const members = items.filter((item) => item.faction === faction);
    if (members.length) group.add(createFactionBatch(members, faction));
  });
  group.userData.approvedAsset = true;
  group.userData.lod = "formation";
  return group;
}

export function createOperatorLodBatch(capacity = 48) {
  const group = new THREE.Group();
  const batches = new Map(["enemy", "soldier"].map((faction) => [faction, createEmptyFactionBatch(capacity, faction)]));
  batches.forEach((batch) => group.add(batch));
  group.userData.approvedAsset = true;
  group.userData.lod = "runtime-batch";
  return Object.freeze({
    group,
    update(items) {
      batches.forEach((batch, faction) => updateFactionBatch(batch, items.filter((item) => item.faction === faction), capacity));
      group.visible = items.length > 0;
    },
  });
}

function createFactionBatch(items, faction) {
  const materials = createApprovedMaterials(faction);
  const batch = new THREE.Group();
  batch.add(
    createInstances(new THREE.CapsuleGeometry(0.18, 0.34, 2, 6), materials.faction, items, torsoTransforms),
    createInstances(new THREE.SphereGeometry(0.16, 8, 6), materials.faction, items, headTransforms),
    createInstances(new THREE.CapsuleGeometry(0.055, 0.28, 2, 6), materials.faction, expandLimbs(items), limbTransforms),
    createInstances(new THREE.BoxGeometry(0.17, 0.12, 0.28), materials.rubber, expandSides(items), bootTransforms),
    createInstances(new THREE.BoxGeometry(0.24, 0.16, 0.92), materials.steel, items, weaponTransforms),
  );
  batch.userData.faction = faction;
  return batch;
}

function createEmptyFactionBatch(capacity, faction) {
  const items = Array.from({ length: capacity }, () => ({ x: 0, z: 0, faction, scale: 1 }));
  const batch = createFactionBatch(items, faction);
  batch.children.forEach((mesh) => { mesh.count = 0; });
  return batch;
}

function updateFactionBatch(batch, items, capacity) {
  const members = items.slice(0, capacity);
  const transforms = [members, members, expandLimbs(members), expandSides(members), members];
  const factories = [torsoTransforms, headTransforms, limbTransforms, bootTransforms, weaponTransforms];
  batch.children.forEach((mesh, index) => updateInstances(mesh, transforms[index], factories[index]));
  batch.visible = members.length > 0;
}

function updateInstances(mesh, items, transformFactory) {
  const transform = new THREE.Object3D();
  items.forEach((item, index) => {
    transformFactory(transform, item, index);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
}

function createInstances(geometry, material, items, transformFactory) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const transform = new THREE.Object3D();
  items.forEach((item, index) => {
    transformFactory(transform, item, index);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return mesh;
}

function torsoTransforms(transform, item) {
  setTransform(transform, item, [0, 0.98, 0], [1.08, 1, 0.76]);
}

function headTransforms(transform, item) {
  setTransform(transform, item, [0, 1.5, 0], [1, 1.08, 1]);
}

function limbTransforms(transform, item) {
  const arm = item.part < 2;
  const side = item.part % 2 ? 1 : -1;
  if (arm) {
    setArmTransform(transform, item, side);
    return;
  }
  const swing = Math.sin(item.index * 1.7) * 0.32 * side;
  setTransform(transform, item, [side * 0.13, 0.48, 0], [1.12, 1.2, 1.12], [swing, 0, side * 0.04]);
}

function setArmTransform(transform, item, side) {
  const shoulder = new THREE.Vector3(side * 0.27, 1.31, 0);
  const grip = new THREE.Vector3(side * 0.11, 1.06, side < 0 ? -0.5 : -0.24);
  const direction = grip.clone().sub(shoulder);
  const center = shoulder.clone().add(grip).multiplyScalar(0.5);
  setTransform(transform, item, center.toArray(), [0.9, direction.length() / 0.39, 0.9]);
  transform.quaternion.setFromUnitVectors(UP, direction.normalize());
}

function bootTransforms(transform, item) {
  const side = item.side ? 1 : -1;
  setTransform(transform, item, [side * 0.13, 0.185, -0.07], [1, 1, 1]);
}

function weaponTransforms(transform, item) {
  setTransform(transform, item, [0, 1.08, -0.48], [0.72, 0.72, 0.72]);
}

function setTransform(transform, item, offset, scale, rotation = [0, 0, 0]) {
  transform.position.set(item.x + offset[0] * item.scale, (offset[1] - FORMATION_GROUND_OFFSET) * item.scale, item.z + offset[2] * item.scale);
  transform.rotation.set(...rotation);
  transform.scale.set(scale[0] * item.scale, scale[1] * item.scale, scale[2] * item.scale);
}

function expandLimbs(items) {
  return items.flatMap((item, index) => [0, 1, 2, 3].map((part) => ({ ...item, index, part })));
}

function expandSides(items) {
  return items.flatMap((item) => [0, 1].map((side) => ({ ...item, side })));
}

const UP = new THREE.Vector3(0, 1, 0);
