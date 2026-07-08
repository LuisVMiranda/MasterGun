import * as THREE from "three";
import { COLORS, TRACK } from "../../game/content/constants.js";

const TILE_COUNT = 112;

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
      updateClouds(clouds, run);
      finishLine.position.z = run ? run.profile.trackLength - run.distance : 120;
    },
  };
}

function createRunwayTiles() {
  const geometry = new THREE.BoxGeometry(TRACK.halfWidth * 2, 0.16, TRACK.tileLength * 0.96);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.02 });
  const mesh = new THREE.InstancedMesh(geometry, material, TILE_COUNT);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  for (let index = 0; index < TILE_COUNT; index += 1) {
    matrix.makeTranslation(0, -0.12, index * TRACK.tileLength);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, color.set(index % 2 ? COLORS.runway : COLORS.runwayAlt));
  }

  mesh.receiveShadow = true;
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
  const material = new THREE.MeshStandardMaterial({
    color: "#f7fbff",
    transparent: true,
    opacity: 0.62,
    roughness: 0.95,
  });

  for (let index = 0; index < 16; index += 1) {
    const cloud = createCloud(material, index);
    group.add(cloud);
  }

  return group;
}

function createCloud(material, index) {
  const group = new THREE.Group();
  const count = 3 + (index % 3);

  for (let part = 0; part < count; part += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.8 + part * 0.12, 12, 8), material);
    puff.scale.set(1.8, 0.42, 0.75);
    puff.position.set((part - 1) * 1.1, 0, Math.sin(part + index) * 0.18);
    group.add(puff);
  }

  group.position.set(index % 2 ? 8.8 : -8.8, 10.5 + (index % 4) * 1.2, 18 + index * 8);
  group.userData.speed = 0.08 + (index % 5) * 0.025;
  return group;
}

function updateClouds(group, run) {
  const distance = run?.distance ?? 0;

  group.children.forEach((cloud, index) => {
    cloud.position.x += Math.sin(distance * 0.015 + index) * cloud.userData.speed * 0.01;
    cloud.position.z = 18 + index * 8 - (distance * 0.12) % 18;
  });
}
