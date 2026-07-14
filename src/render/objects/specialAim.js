import * as THREE from "three";

const DASH_COUNT = 18;

export function createSpecialAimGuide(scene) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: "#fff16b", transparent: true, opacity: 0.92 });
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const dashes = Array.from({ length: DASH_COUNT }, () => new THREE.Mesh(geometry, material));
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.44, 28),
    new THREE.MeshBasicMaterial({ color: "#ff55db", side: THREE.DoubleSide, transparent: true, opacity: 0.94 }),
  );
  marker.rotation.x = -Math.PI / 2;
  group.add(...dashes, marker);
  group.visible = false;
  scene.add(group);
  return { group, dashes, marker };
}

export function updateSpecialAimGuide(guide, run) {
  const shot = run?.specialShot;
  guide.group.visible = Boolean(shot?.active);
  if (!shot?.active) return;

  const start = { x: run.player.x, z: 0.8 };
  const end = { x: shot.lockedX ?? shot.aimX, z: shot.range };
  const length = Math.hypot(end.x - start.x, end.z - start.z);
  const angle = Math.atan2(end.x - start.x, end.z - start.z);
  const dashLength = Math.max(0.7, (length / DASH_COUNT) * 0.58);
  const layout = { start, end, angle, dashLength };

  guide.dashes.forEach((dash, index) => positionDash(dash, index, layout));
  guide.marker.position.set(end.x, 0.67, end.z);
  guide.marker.rotation.z += 0.035;
}

function positionDash(dash, index, layout) {
  const { start, end, angle, dashLength } = layout;
  const ratio = (index + 0.5) / DASH_COUNT;
  const width = 0.055 + ratio * ratio * 0.58;
  dash.position.set(
    THREE.MathUtils.lerp(start.x, end.x, ratio),
    0.65,
    THREE.MathUtils.lerp(start.z, end.z, ratio),
  );
  dash.rotation.y = angle;
  dash.scale.set(width, 0.025, dashLength);
}
