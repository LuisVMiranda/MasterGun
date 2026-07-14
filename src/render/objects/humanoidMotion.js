import * as THREE from "three";

export const HUMANOID_MOTION = Object.freeze({
  IDLE: "idle",
  AIM: "aim",
  FORWARD: "forward",
  BACKWARD: "backward",
  LEFT: "left",
  RIGHT: "right",
});

const MOTION_EPSILON = 0.002;

export function resolveHumanoidMotion(previous, current, fallback = HUMANOID_MOTION.IDLE) {
  if (!previous || !current) return fallback;
  const dx = current.x - previous.x;
  const dz = current.z - previous.z;
  if (Math.abs(dx) > MOTION_EPSILON && Math.abs(dx) >= Math.abs(dz)) return dx > 0 ? HUMANOID_MOTION.RIGHT : HUMANOID_MOTION.LEFT;
  if (Math.abs(dz) > MOTION_EPSILON) return dz < 0 ? HUMANOID_MOTION.FORWARD : HUMANOID_MOTION.BACKWARD;
  return fallback;
}

export function animateHumanoid(humanoid, motion, time) {
  const rig = humanoid.userData.humanoid?.rig;
  if (!rig) return;
  resetRig(rig);
  const animator = ANIMATORS[motion] ?? animateIdle;
  animator(rig, time);
  groundAnimatedFeet(humanoid, rig);
  humanoid.userData.humanoid.motion = motion;
}

function animateIdle(rig, time) {
  rig.head.rotation.y = Math.sin(time * 1.1) * 0.045;
  rig.body.rotation.y = Math.sin(time * 0.7) * 0.012;
}

function animateAim(rig, time) {
  animateIdle(rig, time);
  rig.body.rotation.x = -0.025;
}

function animateForward(rig, time) {
  animateLongitudinal(rig, time, 1);
}

function animateBackward(rig, time) {
  animateLongitudinal(rig, time, -1);
}

function animateLongitudinal(rig, time, direction) {
  const step = Math.sin(time * 7.4) * 0.6 * direction;
  rig.legs[0].rotation.x += step;
  rig.legs[1].rotation.x -= step;
  rig.body.position.y = rig.groundY + Math.abs(Math.sin(time * 7.4)) * 0.025;
  rig.body.rotation.x = direction * -0.055;
  applyArmCounterSwing(rig, step);
}

function animateLeft(rig, time) {
  animateLateral(rig, time, -1);
}

function animateRight(rig, time) {
  animateLateral(rig, time, 1);
}

function animateLateral(rig, time, direction) {
  const step = Math.sin(time * 7.8);
  rig.legs[0].rotation.x += step * 0.22;
  rig.legs[1].rotation.x -= step * 0.22;
  rig.legs[0].rotation.z += direction * (0.17 + step * 0.12);
  rig.legs[1].rotation.z += direction * (0.17 - step * 0.12);
  rig.body.position.y = rig.groundY + Math.max(0, Math.sin(time * 7.8)) * 0.018;
  rig.body.rotation.y = direction * 0.09;
  rig.body.rotation.z = direction * -0.085;
  applyArmCounterSwing(rig, step * 0.32);
}

function applyArmCounterSwing(rig, step) {
  const amount = rig.equipmentPose === "rifle" ? 0.055 : 0.3;
  rig.arms[0].rotation.x += step * amount;
  rig.arms[1].rotation.x -= step * amount;
}

function resetRig(rig) {
  rig.body.position.set(0, rig.groundY, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  [...rig.arms, ...rig.legs].forEach(resetLimb);
}

function resetLimb(limb) {
  limb.rotation.copy(limb.userData.baseRotation);
  limb.userData.lower.rotation.copy(limb.userData.lowerBaseRotation);
}

function groundAnimatedFeet(humanoid, rig) {
  humanoid.updateWorldMatrix(true, true);
  const minY = Math.min(...rig.feet.map(getFootMinY));
  const rootY = humanoid.getWorldPosition(TEMP_POSITION).y;
  const rootScaleY = humanoid.getWorldScale(TEMP_SCALE).y;
  rig.body.position.y += (rootY - minY) / rootScaleY;
  humanoid.updateWorldMatrix(true, true);
}

function getFootMinY(foot) {
  return TEMP_BOUNDS.setFromObject(foot).min.y;
}

const ANIMATORS = Object.freeze({
  [HUMANOID_MOTION.IDLE]: animateIdle,
  [HUMANOID_MOTION.AIM]: animateAim,
  [HUMANOID_MOTION.FORWARD]: animateForward,
  [HUMANOID_MOTION.BACKWARD]: animateBackward,
  [HUMANOID_MOTION.LEFT]: animateLeft,
  [HUMANOID_MOTION.RIGHT]: animateRight,
});

const TEMP_BOUNDS = new THREE.Box3();
const TEMP_POSITION = new THREE.Vector3();
const TEMP_SCALE = new THREE.Vector3();
