import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function addRoundedBox(group, config) {
  const radius = Math.min(config.radius ?? 0.04, Math.min(...config.size) * 0.45);
  const geometry = new RoundedBoxGeometry(...config.size, config.segments ?? 1, radius);
  return addMesh(group, geometry, config);
}

export function addCylinder(group, config) {
  const geometry = new THREE.CylinderGeometry(config.radiusTop ?? config.radius, config.radius, config.length, config.segments ?? 12);
  return addMesh(group, geometry, config);
}

export function addCapsule(group, config) {
  const geometry = new THREE.CapsuleGeometry(config.radius, config.length, config.capSegments ?? 3, config.segments ?? 8);
  return addMesh(group, geometry, config);
}

export function addSphere(group, config) {
  const geometry = new THREE.SphereGeometry(config.radius, config.segments ?? 12, config.rings ?? 8);
  return addMesh(group, geometry, config);
}

export function addMesh(group, geometry, config) {
  const mesh = new THREE.Mesh(geometry, config.material);
  mesh.position.set(...(config.position ?? [0, 0, 0]));
  mesh.rotation.set(...(config.rotation ?? [0, 0, 0]));
  mesh.scale.set(...(config.scale ?? [1, 1, 1]));
  mesh.castShadow = config.castShadow ?? true;
  mesh.receiveShadow = config.receiveShadow ?? false;
  mesh.name = config.name ?? "prototype-part";
  group.add(mesh);
  return mesh;
}

export function addSocket(group, name, position) {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.set(...position);
  group.add(socket);
  return socket;
}

export function countTriangles(root) {
  let triangles = 0;
  root.traverse((object) => {
    if (!object.geometry) return;
    const count = object.geometry.index?.count ?? object.geometry.attributes.position?.count ?? 0;
    triangles += Math.floor(count / 3) * (object.isInstancedMesh ? object.count : 1);
  });
  return triangles;
}
