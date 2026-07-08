import { ENTITY, TRACK } from "../content/constants.js";
import { t } from "../content/i18n.js";
import { applyContactEffect, applyDamageReward, pruneMessages } from "./effects.js";
import { completeRun } from "./gameFlow.js";
import { clamp, intersects, lerp } from "./math.js";
import { getBuildRating } from "./progression.js";
import { calculateLiveScore, getCollisionPenalty } from "./scoring.js";

const CONTACT_LIMIT = 2;
const BOUNCE_DURATION = 1.5;
const BOUNCE_DISTANCE = 0.92;

export function updateRunState(state, input, dt) {
  if (!state.run) return state;

  const run = state.run;
  const delta = Math.min(dt, 0.05);
  run.elapsed += delta;
  run.distance += run.profile.speed * delta;
  updatePlayer(run, input, delta);
  updateWeapons(run, delta);
  moveActors(run, delta);
  updateShooters(run, delta);
  updateBosses(run, delta);
  resolveBulletHits(run);
  resolveEnemyProjectileHits(run);
  resolveTargetCollisions(run);
  resolvePlayerContacts(run);
  updateDamageNumbers(run, delta);
  pruneRun(run, delta);
  run.buildRating = getBuildRating(run.stats);
  run.score = calculateLiveScore(run);

  if (run.distance >= run.profile.trackLength) {
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

  if (run.player.recoilTimer <= 0) {
    run.player.recoilZ = 0;
    return;
  }

  const duration = run.player.recoilDuration ?? BOUNCE_DURATION;
  const ratio = clamp(run.player.recoilTimer / duration, 0, 1);
  run.player.recoilZ = BOUNCE_DISTANCE * Math.sin(ratio * Math.PI * 0.5);
}

function updateWeapons(run, dt) {
  firePrimary(run, dt);
  fireAssistants(run, dt);
}

function firePrimary(run, dt) {
  run.player.shotTimer -= dt;
  const interval = 1 / run.stats.fireRate;
  let shots = 0;

  while (run.player.shotTimer <= 0 && run.player.ammo > 0 && shots < 4) {
    spawnShot(run, run.player.x, 0, run.stats.projectileCount, "player");
    run.player.shotTimer += interval;
    run.player.ammo -= 1;
    shots += 1;
  }
}

function fireAssistants(run, dt) {
  if (run.stats.assistants <= 0) return;

  run.player.assistantTimer -= dt;
  const interval = 0.42;

  if (run.player.assistantTimer <= 0) {
    const count = Math.min(4, run.stats.assistants);
    for (let index = 0; index < count; index += 1) {
      spawnAssistantShot(run, index);
    }
    run.player.assistantTimer = interval;
  }
}

function spawnAssistantShot(run, index) {
  const side = index % 2 ? 1 : -1;
  const offset = side * (0.85 + index * 0.2);
  const x = clamp(run.player.x + offset, -TRACK.halfWidth + 0.35, TRACK.halfWidth - 0.35);
  spawnShot(run, x, 0.65, 1, "assistant");
}

function spawnShot(run, x, zOffset, count, owner) {
  const spread = Math.min(1.4, 0.42 * (count - 1));

  for (let index = 0; index < count; index += 1) {
    const centered = index - (count - 1) / 2;
    run.bullets.push({
      id: run.nextId++,
      owner,
      x: x + centered * spread,
      z: 0.8 + zOffset,
      width: 0.11,
      depth: 0.14,
      damage: run.stats.power,
      remainingRange: run.stats.range,
      active: true,
    });
  }

  queueAudio(run, "shot", owner, count);
}

function moveActors(run, dt) {
  run.bullets.forEach((bullet) => {
    bullet.z += TRACK.bulletSpeed * dt;
    bullet.remainingRange -= TRACK.bulletSpeed * dt;
    bullet.active = bullet.active && bullet.remainingRange > 0;
  });

  run.entities.forEach((entity) => {
    entity.z -= getEntitySpeed(run, entity) * dt;
    moveHazard(entity, run);
    moveWalker(entity, run);
    moveBoss(entity, run);
  });

  run.enemyProjectiles.forEach((projectile) => {
    projectile.x += projectile.vx * dt;
    projectile.z += projectile.vz * dt;
    projectile.active = projectile.active && projectile.z > TRACK.missZ;
  });
}

function getEntitySpeed(run, entity) {
  if (entity.type === ENTITY.BOSS) return Math.max(1.5, run.profile.speed - entity.retreatSpeed);
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
  entity.x = clamp(Math.sin(run.elapsed * 1.5 + entity.id) * 2.2, -2.8, 2.8);
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
  run.entities.forEach((entity) => updateBoss(run, entity, dt));
}

function updateBoss(run, entity, dt) {
  if (entity.type !== ENTITY.BOSS || entity.z < 2 || entity.z > 38) return;

  entity.shootCooldown -= dt;
  if (entity.shootCooldown > 0) return;

  spawnEnemyProjectile(run, entity);
  entity.shootCooldown = entity.shootInterval;
}

function spawnEnemyProjectile(run, shooter) {
  const travelTime = Math.max(0.45, shooter.z / shooter.projectileSpeed);
  const vx = (run.player.x - shooter.x) / travelTime;
  run.enemyProjectiles.push({
    id: run.nextId++,
    owner: "enemy",
    x: shooter.x,
    z: shooter.z - 0.25,
    vx,
    vz: -shooter.projectileSpeed,
    width: 0.18,
    depth: 0.18,
    penalty: shooter.penalty,
    active: true,
  });
  queueAudio(run, "shot", "enemy", 1);
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
  return run.entities.find((entity) => {
    const damageable = entity.active && entity.health > 0;
    return damageable && intersects(bullet, entity);
  });
}

function damageTarget(run, bullet, target) {
  target.health -= bullet.damage;
  bullet.active = false;
  addDamageNumber(run, bullet, target);
  applyAmmoDamageReward(run, bullet, target);

  if (target.type === ENTITY.GATE && target.health <= 0) {
    breakGate(run, target);
    return;
  }

  if (target.health <= 0) {
    target.active = false;
    applyDamageReward(run, target);
  }
}

function breakGate(run, target) {
  target.broken = true;
  target.health = 0;
  target.active = false;

  if (target.gateType === "debuff") {
    run.messages.push({ id: `safe-${target.id}`, text: t(run.locale, "message.debuffCleared"), tone: "buff", ttl: 1.2 });
  }
}

function addDamageNumber(run, bullet, target) {
  const ttl = 0.72;
  run.damageNumbers.push({
    id: run.nextId++,
    text: `-${Math.round(bullet.damage)}`,
    tone: "damage",
    value: Math.round(bullet.damage),
    x: target.x,
    y: getDamageHeight(target),
    z: target.z,
    ttl,
    maxTtl: ttl,
  });
}

function applyAmmoDamageReward(run, bullet, target) {
  if (!target.ammoCap || target.value <= 0 || !target.maxHealth) return;

  const damaged = clamp((target.maxHealth - Math.max(0, target.health)) / target.maxHealth, 0, 1);
  const earnedTotal = Math.min(target.ammoCap, Math.floor(target.ammoCap * damaged));
  const award = earnedTotal - (target.ammoEarned ?? 0);
  if (award <= 0) return;

  target.ammoEarned = earnedTotal;
  run.player.ammo += award;
  run.messages.push({ id: `ammo-${target.id}-${bullet.id}`, text: t(run.locale, "message.ammoEarned", { value: award }), tone: "buff", ttl: 1.1 });
  addAmmoGainNumber(run, award, target);
}

function addAmmoGainNumber(run, value, target) {
  const ttl = 0.72;
  run.damageNumbers.push({
    id: run.nextId++,
    text: t(run.locale, "message.ammoEarned", { value }),
    tone: "buff",
    value,
    x: target.x,
    y: getDamageHeight(target) + 0.32,
    z: target.z,
    ttl,
    maxTtl: ttl,
  });
}

function getDamageHeight(target) {
  const heights = {
    [ENTITY.GATE]: 2.25,
    [ENTITY.BARRICADE]: 1.82,
    [ENTITY.SOLID_WALL]: 2.02,
    [ENTITY.SHOOTER]: 1.72,
    [ENTITY.FINISH_BLOCK]: 1.9,
  };
  return heights[target.type] ?? 1.42;
}

function resolvePlayerContacts(run) {
  const playerBox = { x: run.player.x, z: TRACK.playerZ, width: 0.5, depth: TRACK.contactZ };

  run.entities.forEach((entity) => {
    const canCollect = entity.active && !entity.collected && isContactEntity(entity);

    if (canCollect && intersects(playerBox, entity)) {
      entity.collected = true;
      entity.active = false;
      triggerPlayerBounce(run);
      applyContactEffect(run, entity);
    }
  });
}

function resolveTargetCollisions(run) {
  const playerBox = { x: run.player.x, z: TRACK.playerZ, width: 0.5, depth: TRACK.contactZ };

  run.entities.forEach((entity) => {
    if (!isPenaltyTarget(entity) || !intersects(playerBox, entity)) return;
    collideWithTarget(run, entity);
  });
}

function collideWithTarget(run, entity) {
  const contactHit = (entity.contactHits ?? 0) + 1;
  const key = contactHit >= CONTACT_LIMIT ? "message.collisionPass" : "message.collisionBounce";
  entity.contactHits = contactHit;
  applyScorePenalty(run, getCollisionPenalty(entity, run.level, contactHit), key, entity);

  if (contactHit >= CONTACT_LIMIT) {
    entity.active = false;
    return;
  }

  bounceTarget(run, entity);
}

function bounceTarget(run, entity) {
  const separationZ = TRACK.contactZ + entity.depth + run.profile.speed * BOUNCE_DURATION + 0.35;
  entity.z = Math.max(entity.z, separationZ);
  triggerPlayerBounce(run);
}

function triggerPlayerBounce(run) {
  run.player.recoilDuration = BOUNCE_DURATION;
  run.player.recoilTimer = BOUNCE_DURATION;
  run.player.recoilZ = BOUNCE_DISTANCE;
}

function resolveEnemyProjectileHits(run) {
  const playerBox = { x: run.player.x, z: TRACK.playerZ, width: 0.5, depth: TRACK.contactZ };

  run.enemyProjectiles.forEach((projectile) => {
    if (!projectile.active || !intersects(playerBox, projectile)) return;
    projectile.active = false;
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

function isContactEntity(entity) {
  return entity.type === ENTITY.GATE || entity.type === ENTITY.HAZARD || entity.type === ENTITY.PICKUP || entity.type === ENTITY.WEAPON_PICKUP;
}

function isPenaltyTarget(entity) {
  const targets = [ENTITY.ENEMY, ENTITY.BARRICADE, ENTITY.SOLID_WALL, ENTITY.SHOOTER, ENTITY.FINISH_BLOCK, ENTITY.BOSS];
  return targets.includes(entity.type) && entity.active && entity.health > 0;
}

function applyScorePenalty(run, value, key, source) {
  run.scorePenalty += value;
  run.messages.push({ id: `score-${source.id}-${run.elapsed}`, text: formatPenalty(run, key, value), tone: "debuff", ttl: 1.1 });
  addScoreLossNumber(run, value, source);
  queueAudio(run, "scoreLoss", "player", 1);
}

function addScoreLossNumber(run, value, source) {
  const ttl = 0.86;
  run.damageNumbers.push({
    id: run.nextId++,
    text: formatPenalty(run, "message.scoreLoss", value),
    tone: "penalty",
    value,
    x: source.x ?? run.player.x,
    y: 1.9,
    z: source.z ?? TRACK.playerZ + 0.8,
    ttl,
    maxTtl: ttl,
  });
}

function formatPenalty(run, key, value) {
  return t(run.locale, key, { value });
}

function pruneRun(run, dt) {
  run.bullets = run.bullets.filter((bullet) => bullet.active).slice(-220);
  run.enemyProjectiles = run.enemyProjectiles.filter((projectile) => projectile.active).slice(-120);
  run.damageNumbers = run.damageNumbers.filter((damage) => damage.ttl > 0).slice(-80);
  run.entities = run.entities.filter((entity) => entity.active && entity.z > TRACK.missZ);
  pruneMessages(run, dt);
}
