import { ENTITY, TRACK } from "../content/constants.js";
import { t } from "../content/i18n.js";
import { recordAmmoEarned, recordCollision, recordDamage, recordDestroyedTarget } from "./achievements.js";
import { recordPickupShot, recordProjectileHit } from "./achievements.js";
import { applyAmmoGain, updateAmmoGain } from "./ammoGain.js";
import { tightenBossApproach } from "./bossApproach.js";
import { addAmmoGainNumber, addDamageNumber } from "./damageNumbers.js";
import { applyContactEffect, applyDamageReward, pruneMessages } from "./effects.js";
import { completeRun, failRun } from "./gameFlow.js";
import { canCollectEntity, canDamageEntity, isBlockingEntity, shouldBounceOnCollect } from "./entityInteractions.js";
import { applyLifeLoss, recoverLifeByDistance } from "./life.js";
import { clamp, intersects, lerp } from "./math.js";
import { getBuildRating } from "./progression.js";
import { blockEnemyShots, getProjectileHitBox } from "./projectiles.js";
import { advanceSpecialShot, getPlayerProjectileWidth, getSpecialShotDamage, hasRunEffect, isRunEffect, isSpecialTargeting, updateRunEffects } from "./runEffects.js";
import { calculateLiveScore, getCollisionPenalty } from "./scoring.js";
import { getSoldierTargetMultiplier, isWallMaterial } from "./soldierDamage.js";
import { damageRecruitSoldier, recruitSoldierFromHit, updateSoldiers } from "./soldiers.js";
import { getBossDamageMultiplier, isBossBlocking, recordBossDamage, updateBossCombat } from "./bossCombat.js";
import { updateModeAmmoSupport } from "./modeSupport.js";

const CONTACT_LIMIT = 2;
const BOUNCE_DURATION = 1.5;
const BOUNCE_DISTANCE = 0.92;
const WORLD_BOUNCE_SECONDS = 1.5;

export function updateRunState(state, input, dt) {
  if (!state.run) return state;
  const run = state.run;
  const delta = Math.min(dt, 0.05);
  if (isSpecialTargeting(run)) {
    if (advanceSpecialShot(run, input, delta)) queueAudio(run, "specialShot", "player", 1);
    pruneMessages(run, delta);
    return state;
  }
  run.elapsed += delta;
  updateRunEffects(run, delta);
  updatePlayer(run, input, delta);
  const distanceDelta = run.profile.speed * getRunSpeedScale(run) * delta;
  run.distance += distanceDelta;
  recoverLifeByDistance(run, distanceDelta);
  updateWeapons(run, delta);
  moveActors(run, delta);
  updateShooters(run, delta);
  updateBosses(run, delta);
  updateModeAmmoSupport(run, delta);
  resolveBulletHits(run);
  blockEnemyShots(run);
  resolveEnemyProjectileHits(run);
  resolveTargetCollisions(run);
  resolvePlayerContacts(run);
  tightenBossApproach(run);
  updateDamageNumbers(run, delta);
  updateAmmoGain(run, delta);
  pruneRun(run, delta);
  holdFinishForBoss(run);
  run.buildRating = getBuildRating(run.stats);
  run.score = calculateLiveScore(run);

  if (run.player.life <= 0 && (run.player.lifeDamageTaken ?? 0) > 0) {
    return failRun(state);
  }

  if (shouldCompleteRun(run)) {
    return completeRun(state);
  }

  return state;
}

function updatePlayer(run, input, dt) {
  if (input.pointerActive) {
    run.player.targetX = input.pointerX;
  }

  if (Math.abs(input.axisX) > 0.05) {
    run.player.targetX += input.axisX * dt * 7;
  }

  run.player.targetX = clamp(run.player.targetX, -TRACK.halfWidth + 0.6, TRACK.halfWidth - 0.6);
  run.player.x = lerp(run.player.x, run.player.targetX, dt * 14);
  updatePlayerRecoil(run, dt);
}

function updatePlayerRecoil(run, dt) {
  run.player.recoilTimer = Math.max(0, (run.player.recoilTimer ?? 0) - dt);
  run.player.interruptTimer = Math.max(0, (run.player.interruptTimer ?? 0) - dt);

  if (run.player.recoilTimer <= 0) {
    run.player.recoilZ = 0;
    return;
  }

  const duration = run.player.recoilDuration ?? BOUNCE_DURATION;
  const ratio = clamp(run.player.recoilTimer / duration, 0, 1);
  run.player.recoilZ = BOUNCE_DISTANCE * Math.sin(ratio * Math.PI * 0.5);
}

function getRunSpeedScale(run) {
  const timer = run.player.interruptTimer ?? 0;
  if (timer <= 0) return 1;
  const ratio = clamp(timer / BOUNCE_DURATION, 0, 1);
  return 0.22 + (1 - ratio) * 0.78;
}

function updateWeapons(run, dt) {
  firePrimary(run, dt);
  updateSoldiers(run, dt, (x, zOffset, count, owner, damage) => spawnShot(run, x, zOffset, count, { damage, owner }));
}

function firePrimary(run, dt) {
  run.player.shotTimer -= dt;
  if (hasRunEffect(run, "forceReload")) return;
  const interval = 1 / run.stats.fireRate;
  let shots = 0;
  const freeAmmo = hasRunEffect(run, "noAmmoConsumption");

  while (run.player.shotTimer <= 0 && (run.player.ammo > 0 || freeAmmo) && shots < 4) {
    spawnShot(run, run.player.x, 0, run.stats.projectileCount, { owner: "player" });
    run.player.shotTimer += interval;
    if (!freeAmmo) run.player.ammo -= 1;
    shots += 1;
  }
}

function spawnShot(run, x, zOffset, count, details) {
  const { owner, damage = run.stats.power } = details;
  const visualKind = owner === "player" ? run.weaponId : owner;
  const spread = Math.min(1.4, 0.42 * (count - 1));
  if (owner === "player" && run.metrics) run.metrics.shotsFired = (run.metrics.shotsFired ?? 0) + count;
  for (let index = 0; index < count; index += 1) {
    const centered = index - (count - 1) / 2;
    run.bullets.push({
      id: run.nextId++,
      owner,
      bornAt: run.elapsed,
      visualKind,
      weaponId: owner === "player" ? run.weaponId : null,
      x: x + centered * spread,
      z: 0.8 + zOffset,
      width: getPlayerProjectileWidth(run, owner),
      thin: owner === "player" && hasRunEffect(run, "thinProjectile"),
      depth: 0.14,
      ...getShotSize(owner),
      damage,
      remainingRange: run.stats.range,
      active: true,
    });
  }

  queueAudio(run, "shot", owner, count);
}

function moveActors(run, dt) {
  run.bullets.forEach((bullet) => {
    bullet.previousZ = bullet.z;
    const speed = bullet.speed ?? TRACK.bulletSpeed;
    bullet.x += (bullet.vx ?? 0) * dt;
    bullet.z += speed * dt;
    bullet.remainingRange -= speed * dt;
    bullet.active = bullet.active && bullet.remainingRange > 0;
  });

  run.entities.forEach((entity) => {
    entity.z -= getEntitySpeed(run, entity) * dt * getRunSpeedScale(run);
    moveHazard(entity, run);
    moveWalker(entity, run);
    moveBoss(entity, run);
  });

  run.enemyProjectiles.forEach((projectile) => {
    projectile.previousZ = projectile.z;
    projectile.x += projectile.vx * dt;
    projectile.z += projectile.vz * dt;
    projectile.active = projectile.active && projectile.z > TRACK.missZ;
  });
}

function getEntitySpeed(run, entity) {
  if (entity.type === ENTITY.BOSS && entity.engageZ && entity.z > entity.engageZ) return run.profile.speed;
  if (entity.type === ENTITY.BOSS) return Math.max(0.05, run.profile.speed - entity.retreatSpeed);
  if (entity.enemyKind === "sprinter") return run.profile.speed * 1.12;
  if (entity.enemyKind === "shield") return run.profile.speed * 0.96;
  if (entity.enemyKind === "brute") return run.profile.speed * 0.86;
  return run.profile.speed;
}

function moveHazard(entity, run) {
  if (entity.type !== ENTITY.HAZARD || run.profile.band === "early") return;
  entity.x += Math.sin(run.elapsed * 3 + entity.id) * 0.015;
}

function moveWalker(entity, run) {
  if (entity.type !== ENTITY.SHOOTER || entity.shooterKind !== "walker") return;
  entity.x = clamp(entity.originX + Math.sin(run.elapsed * 1.8 + entity.id) * 1.15, -3.3, 3.3);
}

function moveBoss(entity, run) {
  if (entity.type !== ENTITY.BOSS) return;
  const patrolX = Math.sin(run.elapsed * 1.5 + entity.id) * 2.2;
  const targetX = entity.skillState === "sidestepping" ? entity.sidestepTargetX : patrolX;
  const response = entity.skillState === "sidestepping" ? 0.24 : 0.08;
  entity.x = clamp(entity.x + (targetX - entity.x) * response, -2.8, 2.8);
}

function updateShooters(run, dt) {
  run.entities.forEach((entity) => updateShooter(run, entity, dt));
}

function updateShooter(run, entity, dt) {
  if (entity.type !== ENTITY.SHOOTER || entity.z < 2 || entity.z > 32) return;

  entity.shootCooldown -= dt;
  if (entity.shootCooldown > 0) return;

  spawnEnemyProjectile(run, entity);
  entity.shootCooldown = entity.shootInterval;
}

function updateBosses(run, dt) {
  run.entities.forEach((entity) => updateBossCombat(run, entity, dt, spawnEnemyProjectile));
}

function spawnEnemyProjectile(run, shooter, shot = {}) {
  run.enemyProjectiles.push({
    id: run.nextId++,
    owner: "enemy",
    bornAt: run.elapsed,
    visualKind: "enemy",
    sourceId: shooter.id,
    x: shooter.x + (shot.xOffset ?? 0),
    z: shooter.z - 0.25,
    vx: getEnemyProjectileVx(run, shooter, shot) + (shot.laneVelocity ?? 0),
    vz: -shooter.projectileSpeed,
    width: 0.18,
    depth: 0.18,
    penalty: shooter.penalty,
    color: shooter.projectileColor,
    active: true,
  });
  queueAudio(run, "shot", "enemy", 1);
}

function getEnemyProjectileVx(run, shooter, shot = {}) {
  if (shooter.type !== ENTITY.BOSS) return 0;
  const travelTime = Math.max(0.45, shooter.z / shooter.projectileSpeed);
  const aimX = run.player.x + getBossAimError(run, shooter) + (shot.aimOffset ?? 0);
  return (aimX - shooter.x) / travelTime;
}

function getBossAimError(run, shooter) {
  const levelSharpness = clamp((run.level - 1) / 90, 0, 1);
  const baseError = 1.05 - levelSharpness * 0.78;
  return Math.sin(run.elapsed * 1.7 + shooter.id * 1.31) * baseError * 0.45;
}

function resolveBulletHits(run) {
  run.bullets.forEach((bullet) => {
    if (!bullet.active) return;
    const target = findBulletTarget(run, bullet);

    if (target) {
      damageTarget(run, bullet, target);
    }
  });
}

function findBulletTarget(run, bullet) {
  const hitBox = getProjectileHitBox(bullet);
  return run.entities.find((entity) => {
    return canDamageEntity(entity) && !bullet.hitIds?.includes(entity.id) && intersects(hitBox, entity);
  });
}

function damageTarget(run, bullet, target) {
  if (handleProtectedTargetHit(run, bullet, target)) return;

  const damage = getBulletDamage(run, bullet, target);
  const appliedDamage = Math.min(damage, Math.max(0, target.health));
  target.health -= damage;
  if (target.type === ENTITY.BOSS) recordBossDamage(run, target);
  bullet.hitIds?.push(target.id);
  bullet.active = Boolean(bullet.special);
  recordDamage(run, appliedDamage);
  addDamageNumber(run, damage, target);
  applyAmmoDamageReward(run, bullet, target);

  if (target.type === ENTITY.GATE && target.health <= 0) {
    collectShotGate(run, target);
    return;
  }

  if ([ENTITY.PICKUP, ENTITY.WEAPON_PICKUP].includes(target.type) && target.health <= 0) {
    collectShotPickup(run, target);
    return;
  }

  if (target.type === ENTITY.HAZARD && target.health <= 0) {
    clearShotHazard(run, target);
    return;
  }

  resolveDestroyedTarget(run, target);
}

function resolveDestroyedTarget(run, target) {
  if (target.health > 0) return;
  target.active = false;
  recordDestroyedTarget(run, target);
  applyDamageReward(run, target);
}

function handleProtectedTargetHit(run, bullet, target) {
  if (handleRecruiterHit(run, bullet, target)) return true;
  if (target.type !== ENTITY.BOSS || !isBossBlocking(target)) return false;
  bullet.active = false;
  addDamageNumber(run, 0, target);
  return true;
}

function handleRecruiterHit(run, bullet, target) {
  if (target.type !== ENTITY.RECRUITER || bullet.special) return false;
  damageRecruiter(run, bullet, target);
  return true;
}

function damageRecruiter(run, bullet, target) {
  bullet.active = false;
  const recruited = recruitSoldierFromHit(run, target);
  recordProjectileHit(run);
  addDamageNumber(run, recruited ? 1 : 0, target);

  if (target.health <= 0) {
    target.active = false;
    recordDestroyedTarget(run, target);
  }
}

function collectShotPickup(run, target) {
  target.active = false;
  target.collected = true;
  recordPickupShot(run);
  applyContactEffect(run, target, "shot");
}

function clearShotHazard(run, target) {
  target.active = false;
  recordDestroyedTarget(run, target);
  if (isRunEffect(target.stat)) {
    target.collected = true;
    applyContactEffect(run, target);
    return;
  }
  run.messages.push({ id: `hazard-clear-${target.id}`, text: t(run.locale, "message.debuffCleared"), tone: "buff", ttl: 1.2 });
}

function breakGate(run, target) {
  target.broken = true;
  target.health = 0;
  target.active = false;
  recordDestroyedTarget(run, target);

  if (target.gateType === "debuff" && !isRunEffect(target.stat)) {
    run.messages.push({ id: `safe-${target.id}`, text: t(run.locale, "message.debuffCleared"), tone: "buff", ttl: 1.2 });
  }
}

function collectShotGate(run, target) {
  breakGate(run, target);
  if (target.gateType !== "buff" && !isRunEffect(target.stat)) return;

  target.collected = true;
  recordPickupShot(run);
  applyContactEffect(run, target, "shot");
}

function getTargetDamage(run, bullet, target) {
  return bullet.damage * getTargetMultiplier(run, bullet, target);
}

function getBulletDamage(run, bullet, target) {
  return bullet.special ? getSpecialShotDamage(target) : getTargetDamage(run, bullet, target);
}

function getTargetMultiplier(run, bullet, target) {
  let multiplier = 1;
  if (bullet.owner === "soldier") multiplier = getSoldierTargetMultiplier(run.stats, target);
  else if (isWallMaterial(target)) multiplier = run.stats.wallDamageMultiplier;
  else if (target.enemyKind === "shield") multiplier = run.stats.shieldDamageMultiplier;
  if (target.type === ENTITY.BOSS) multiplier *= getBossDamageMultiplier(target);
  return multiplier;
}

function getShotSize(owner) {
  return owner === "soldier" ? { width: 0.07, depth: 0.09 } : {};
}

function applyAmmoDamageReward(run, bullet, target) {
  if (!target.ammoCap || target.value <= 0 || !target.maxHealth) return;

  const damaged = clamp((target.maxHealth - Math.max(0, target.health)) / target.maxHealth, 0, 1);
  const earnedTotal = Math.min(target.ammoCap, Math.floor(target.ammoCap * damaged));
  const award = earnedTotal - (target.ammoEarned ?? 0);
  if (award <= 0) return;

  target.ammoEarned = earnedTotal;
  applyAmmoGain(run, award);
  recordAmmoEarned(run, award);
  run.messages.push({ id: `ammo-${target.id}-${bullet.id}`, text: t(run.locale, "message.ammoEarned", { value: award }), tone: "buff", ttl: 1.1 });
  addAmmoGainNumber(run, award, target);
}

function resolvePlayerContacts(run) {
  const playerBox = { x: run.player.x, z: TRACK.playerZ, width: 0.5, depth: TRACK.contactZ };

  run.entities.forEach((entity) => {
    if (!canCollectEntity(entity) || !intersects(playerBox, entity)) return;

    collectEntity(run, entity);
  });
}

function collectEntity(run, entity) {
  entity.collected = true;
  entity.active = false;
  if (shouldBounceOnCollect(entity)) {
    recordCollision(run);
    applyBounceLifeLoss(run, entity);
    triggerPlayerBounce(run, entity);
  }
  applyContactEffect(run, entity);
}

function resolveTargetCollisions(run) {
  const playerBox = { x: run.player.x, z: TRACK.playerZ, width: 0.5, depth: TRACK.contactZ };

  run.entities.forEach((entity) => {
    if (!isBlockingEntity(entity) || !intersects(playerBox, entity)) return;
    collideWithTarget(run, entity);
  });
}

function collideWithTarget(run, entity) {
  const contactHit = (entity.contactHits ?? 0) + 1;
  const bossContact = entity.type === ENTITY.BOSS;
  const key = !bossContact && contactHit >= CONTACT_LIMIT ? "message.collisionPass" : "message.collisionBounce";
  entity.contactHits = contactHit;
  recordCollision(run);
  applyScorePenalty(run, getCollisionPenalty(entity, run.level, contactHit), key, entity, contactHit);

  if (bossContact) {
    triggerPlayerBounce(run, entity);
    return;
  }

  if (contactHit >= CONTACT_LIMIT) {
    entity.active = false;
    return;
  }

  triggerPlayerBounce(run, entity);
}

function triggerPlayerBounce(run, source) {
  run.player.recoilDuration = BOUNCE_DURATION;
  run.player.recoilTimer = BOUNCE_DURATION;
  run.player.interruptTimer = BOUNCE_DURATION;
  run.player.recoilZ = BOUNCE_DISTANCE;
  pushRunwayAway(run, source);
}

function pushRunwayAway(run, source) {
  const distance = run.profile.speed * WORLD_BOUNCE_SECONDS;
  run.distance = Math.max(0, run.distance - distance);

  run.entities.forEach((entity) => {
    if (entity.active) entity.z += distance;
  });

  run.enemyProjectiles.forEach((projectile) => {
    projectile.z += distance;
  });

  addScoreLossNumber(run, 0, { ...source, z: TRACK.playerZ + 0.8, textKey: "message.interrupted" });
}

function resolveEnemyProjectileHits(run) {
  const playerBox = { x: run.player.x, z: TRACK.playerZ, width: 0.5, depth: TRACK.contactZ };

  run.enemyProjectiles.forEach((projectile) => {
    if (!projectile.active || damageRecruitSoldier(run, projectile)) return;
    if (!intersects(playerBox, getProjectileHitBox(projectile))) return;
    projectile.active = false;
    recordProjectileHit(run);
    recordCollision(run);
    applyScorePenalty(run, projectile.penalty, "message.scoreLoss", projectile);
  });
}

function updateDamageNumbers(run, dt) {
  run.damageNumbers.forEach((damage) => {
    damage.ttl -= dt;
    damage.y += dt * 1.2;
    damage.z -= run.profile.speed * dt;
  });
}

function queueAudio(run, type, owner, count) {
  run.audioEvents.push({
    type,
    owner,
    count,
  });
}

function applyBounceLifeLoss(run, source) {
  const lifeLoss = applyLifeLoss(run, source, 0, 1);
  run.messages.push({ id: `life-${source.id}-${run.elapsed}`, text: t(run.locale, "message.lifeLoss", { value: lifeLoss }), tone: "debuff", ttl: 1.1 });
  addLifeLossNumber(run, lifeLoss, source);
  queueAudio(run, "scoreLoss", "player", 1);
}

function applyScorePenalty(run, value, key, source, contactHit = 2) {
  run.scorePenalty += value;
  const lifeLoss = applyLifeLoss(run, source, value, contactHit);
  run.messages.push({ id: `score-${source.id}-${run.elapsed}`, text: t(run.locale, key, { value }), tone: "debuff", ttl: 1.1 });
  addScoreLossNumber(run, value, source);
  addLifeLossNumber(run, lifeLoss, source);
  queueAudio(run, "scoreLoss", "player", 1);
}

function addScoreLossNumber(run, value, source) {
  const ttl = 0.86;
  run.damageNumbers.push({
    id: run.nextId++,
    text: source.textKey ? t(run.locale, source.textKey) : t(run.locale, "message.scoreLoss", { value }),
    tone: "penalty",
    value,
    x: source.x ?? run.player.x,
    y: 1.9,
    z: source.z ?? TRACK.playerZ + 0.8,
    ttl,
    maxTtl: ttl,
  });
}

function addLifeLossNumber(run, value, source) {
  const ttl = 0.86;
  run.damageNumbers.push({
    id: run.nextId++,
    text: t(run.locale, "message.lifeLoss", { value }),
    tone: "penalty",
    value,
    x: source.x ?? run.player.x,
    y: 2.25,
    z: source.z ?? TRACK.playerZ + 0.8,
    ttl,
    maxTtl: ttl,
  });
}

function pruneRun(run, dt) {
  run.bullets = run.bullets.filter((bullet) => bullet.active).slice(-220);
  run.enemyProjectiles = run.enemyProjectiles.filter((projectile) => projectile.active).slice(-120);
  run.damageNumbers = run.damageNumbers.filter((damage) => damage.ttl > 0).slice(-80);
  run.entities = run.entities.filter((entity) => entity.active && (entity.type === ENTITY.BOSS || entity.z > TRACK.missZ));
  pruneMessages(run, dt);
}

function holdFinishForBoss(run) {
  if (hasMandatoryBossAlive(run) && run.distance >= run.profile.trackLength) {
    run.distance = run.profile.trackLength;
  }
}

function shouldCompleteRun(run) {
  if (run.profile.challenge) return !hasMandatoryBossAlive(run) && !hasBossCashAlive(run);
  return run.distance >= run.profile.trackLength && !hasMandatoryBossAlive(run);
}

function hasMandatoryBossAlive(run) {
  return run.profile.challenge && run.entities.some((entity) => entity.type === ENTITY.BOSS && entity.active && entity.health > 0);
}

function hasBossCashAlive(run) {
  return run.entities.some((entity) => entity.type === ENTITY.CASH && entity.sourceType === ENTITY.BOSS && entity.active);
}
